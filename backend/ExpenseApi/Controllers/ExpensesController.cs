using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using ExpenseApi.Services;
using ExpenseApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System;

namespace ExpenseApi.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ExpensesController : ControllerBase
{
    private readonly ExpenseContext _context;
    private readonly AiService _aiService;

    public ExpensesController(ExpenseContext context, AiService aiService)
    {
        _context = context;
        _aiService = aiService;

        // SEEDER: Körs bara om databasen är helt tom på kategorier
        if (!_context.Categories.Any())
        {
            _context.Categories.AddRange(
                // 🏠 Boende & Fasta kostnader
                new Category { Name = "Boende" },
                new Category { Name = "El & Värme" },
                new Category { Name = "Försäkringar" },
                new Category { Name = "Abonnemang" }, // Netflix, Spotify m.m.

                // 🚗 Transport
                new Category { Name = "Transport" }, // Generell (busskort etc)
                new Category { Name = "Drivmedel" },
                new Category { Name = "Bilunderhåll" },

                // 🥦 Mat & Dryck
                new Category { Name = "Livsmedel" },
                new Category { Name = "Uteätande" },
                new Category { Name = "Systembolaget" },

                // 🛍️ Shopping & Nöje
                new Category { Name = "Kläder & Skor" },
                new Category { Name = "Elektronik" },
                new Category { Name = "Nöje" },
                new Category { Name = "Husdjur" }, // Viktig för kattmaten! 🐱
                new Category { Name = "Hobby" },

                // 💊 Hälsa
                new Category { Name = "Hälsa & Apotek" },
                new Category { Name = "Träning" },

                // 💰 Övrigt
                new Category { Name = "Sparande" },
                new Category { Name = "Lån & Räntor" },
                new Category { Name = "Övrigt" }
            );
            _context.SaveChanges();
        }
    }

    [HttpGet] // Tog bort "/api/expenses" här eftersom [Route] högst upp redan sköter det
    public async Task<ActionResult<IEnumerable<Expense>>> GetExpenses()
    {
        return await _context.Expenses
            .Include(e => e.Category)
            .OrderByDescending(e => e.Date) // Sortera så nyaste kommer först
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Expense>> GetExpense(int id)
    {
        var expense = await _context.Expenses.Include(e => e.Category).FirstOrDefaultAsync(e => e.Id == id);
        if (expense == null) return NotFound();
        return expense;
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteExpense(int id)
    {
        var expense = await _context.Expenses.FindAsync(id);
        if (expense == null)
        {
            return NotFound();
        }

        _context.Expenses.Remove(expense);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Logga eller hantera beroenden/constraint‑fel om det behövs
            return StatusCode(StatusCodes.Status500InternalServerError, "Kunde inte ta bort utgiften.");
        }

        return NoContent(); // 204 enligt REST‑konvention
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutExpense(int id, [FromBody] Expense expense)
    {
        if (id != expense.Id)
        {
            return BadRequest("Id i URL och body matchar inte.");
        }

        // Validera modelstate om du använder DTO/valideringar
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Kontrollera att posten finns
        var existing = await _context.Expenses.FindAsync(id);
        if (existing == null)
        {
            return NotFound();
        }

        // Uppdatera fält (kopiera bara de fält du vill tillåta att uppdateras)
        existing.Amount = expense.Amount;
        existing.Description = expense.Description;
        existing.Date = expense.Date;
        existing.CategoryId = expense.CategoryId;

        // Om du vill ladda kategoriobjektet efter uppdatering:
        // await _context.Entry(existing).Reference(e => e.Category).LoadAsync();

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.Expenses.AnyAsync(e => e.Id == id))
                return NotFound();
            throw;
        }

        // Returnera NoContent enligt REST‑konventioner för PUT
        return NoContent();
    }


    // --- HÄR VAR FELET FIXAT ---
    [HttpPost]
    public async Task<ActionResult<Expense>> PostExpense(Expense expense)
    {
        // 1. Om CategoryId saknas (0) ELLER om användaren valde "Låt AI gissa" (som skickar 0), kör AI-logik
        if (expense.CategoryId == 0)
        {
            // A. Hämta alla dina kategorier (inklusive Husdjur, Abonnemang etc)
            var categoryNames = await _context.Categories
                                              .Select(c => c.Name)
                                              .ToListAsync();

            // B. Skicka beskrivningen OCH listan till AI:n
            // HÄR VAR FELET: ändrade 'expenseDto.Description' till 'expense.Description'
            var aiCategoryName = await _aiService.CategorizeExpenseAsync(expense.Description, categoryNames);

            // C. Hitta matchande kategori i databasen
            var category = await _context.Categories
                                         .FirstOrDefaultAsync(c => c.Name == aiCategoryName);

            // D. Fallback om AI gissade på något som inte finns (säkerhetsåtgärd)
            if (category == null)
            {
                category = await _context.Categories.FirstOrDefaultAsync(c => c.Name == "Övrigt");

                // Super-fallback om inte ens "Övrigt" finns (för att undvika krasch)
                if (category == null)
                {
                    // Skapa en temporär kategori om allt annat fallerar
                    var tempCat = new Category { Name = "Okänd" };
                    _context.Categories.Add(tempCat);
                    await _context.SaveChangesAsync();
                    category = tempCat;
                }
            }

            expense.CategoryId = category.Id;
        }

        // 2. Spara utgiften
        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();

        // 3. Ladda kategoriobjektet så att frontenden kan visa namnet direkt
        await _context.Entry(expense).Reference(e => e.Category).LoadAsync();

        return CreatedAtAction(nameof(GetExpense), new { id = expense.Id }, expense);
    }

}