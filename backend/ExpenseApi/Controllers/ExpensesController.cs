using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using ExpenseApi.Services;
using ExpenseApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System;
using Microsoft.AspNetCore.Http;

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

        if (!_context.Categories.Any())
        {
            _context.Categories.AddRange(
                new Category { Name = "Boende" },
                new Category { Name = "El & Värme" },
                new Category { Name = "Försäkringar" },
                new Category { Name = "Abonnemang" },
                new Category { Name = "Transport" },
                new Category { Name = "Drivmedel" },
                new Category { Name = "Bilunderhåll" },
                new Category { Name = "Livsmedel" },
                new Category { Name = "Uteätande" },
                new Category { Name = "Systembolaget" },
                new Category { Name = "Kläder & Skor" },
                new Category { Name = "Elektronik" },
                new Category { Name = "Nöje" },
                new Category { Name = "Husdjur" },
                new Category { Name = "Hobby" },
                new Category { Name = "Hälsa & Apotek" },
                new Category { Name = "Träning" },
                new Category { Name = "Sparande" },
                new Category { Name = "Lån & Räntor" },
                new Category { Name = "Övrigt" }
            );
            _context.SaveChanges();
        }
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Expense>>> GetExpenses()
    {
        return await _context.Expenses
            .Include(e => e.Category)
            .Include(e => e.Items) // <-- Inkludera kvittoraderna
            .OrderByDescending(e => e.Date)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Expense>> GetExpense(int id)
    {
        var expense = await _context.Expenses
            .Include(e => e.Category)
            .Include(e => e.Items) // <-- Inkludera kvittoraderna
            .FirstOrDefaultAsync(e => e.Id == id);

        if (expense == null) return NotFound();
        return expense;
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteExpense(int id)
    {
        var expense = await _context.Expenses
            .Include(e => e.Items) // Säkerställer att relaterade rader raderas
            .FirstOrDefaultAsync(e => e.Id == id);

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
            return StatusCode(StatusCodes.Status500InternalServerError, "Kunde inte ta bort utgiften.");
        }

        return NoContent();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutExpense(int id, [FromBody] Expense expense)
    {
        if (id != expense.Id)
        {
            return BadRequest("Id i URL och body matchar inte.");
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var existing = await _context.Expenses
            .Include(e => e.Items)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (existing == null)
        {
            return NotFound();
        }

        if (expense.CategoryId == 0)
        {
            var categoryNames = await _context.Categories.Select(c => c.Name).ToListAsync();
            var aiCategoryName = await _aiService.CategorizeExpenseAsync(expense.Description, categoryNames);

            var category = await _context.Categories
                                         .FirstOrDefaultAsync(c => c.Name == aiCategoryName)
                           ?? await _context.Categories.FirstOrDefaultAsync(c => c.Name == "Övrigt");

            if (category != null)
            {
                expense.CategoryId = category.Id;
            }
        }

        var categoryExists = await _context.Categories.AnyAsync(c => c.Id == expense.CategoryId);
        if (!categoryExists)
        {
            return BadRequest($"Kategori med ID {expense.CategoryId} finns inte.");
        }

        // Uppdatera grundfälten
        existing.Amount = expense.Amount;
        existing.Description = expense.Description;
        existing.Date = expense.Date;
        existing.CategoryId = expense.CategoryId;

        // Uppdatera items om nya skickades med
        if (expense.Items != null && expense.Items.Any())
        {
            _context.ExpenseItems.RemoveRange(existing.Items);
            foreach (var item in expense.Items)
            {
                existing.Items.Add(new ExpenseItem
                {
                    Name = item.Name,
                    Price = item.Price,
                    Discount = item.Discount,
                    FinalPrice = item.FinalPrice
                });
            }
        }

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

        return NoContent();
    }

    [HttpPost]
    public async Task<ActionResult<Expense>> PostExpense(Expense expense)
    {
        if (expense.CategoryId == 0)
        {
            var categoryNames = await _context.Categories
                                             .Select(c => c.Name)
                                             .ToListAsync();

            var aiCategoryName = await _aiService.CategorizeExpenseAsync(expense.Description, categoryNames);

            var category = await _context.Categories
                                         .FirstOrDefaultAsync(c => c.Name == aiCategoryName);

            if (category == null)
            {
                category = await _context.Categories.FirstOrDefaultAsync(c => c.Name == "Övrigt");

                if (category == null)
                {
                    var tempCat = new Category { Name = "Okänd" };
                    _context.Categories.Add(tempCat);
                    await _context.SaveChangesAsync();
                    category = tempCat;
                }
            }

            expense.CategoryId = category.Id;
        }

        // Sparar utgiften och dess Items (EF Core sköter ExpenseId på alla rader automatiskt)
        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();

        // Ladda relationerna så svaret innehåller både kategori och rader
        await _context.Entry(expense).Reference(e => e.Category).LoadAsync();
        await _context.Entry(expense).Collection(e => e.Items).LoadAsync();

        return CreatedAtAction(nameof(GetExpense), new { id = expense.Id }, expense);
    }
}