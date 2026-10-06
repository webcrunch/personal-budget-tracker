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

    [HttpPost("import-csv")]
public async Task<ActionResult<object>> ImportCsv(IFormFile file)
{
    if (file == null || file.Length == 0)
    {
        return BadRequest(new { message = "Ingen fil skickades med." });
    }

    // 1. Parsa CSV till en preliminär lista
    var parsedRows = new List<(DateTime Date, string Description, decimal Amount)>();

    using (var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8, detectEncodingFromByteOrderMarks: true))
    {
        string? headerLine = await reader.ReadLineAsync();
        if (string.IsNullOrWhiteSpace(headerLine))
            return BadRequest(new { message = "CSV-filen är tom." });

        char separator = headerLine.Contains(';') ? ';' : ',';
        var headers = headerLine.Split(separator).Select(h => h.Trim().Trim('"').ToLower()).ToList();

        int dateIdx = headers.FindIndex(h => h.Contains("datum") || h.Contains("date") || h.Contains("bokföringsdag"));
        int descIdx = headers.FindIndex(h => h.Contains("beskrivning") || h.Contains("rubrik") || h.Contains("text") || h.Contains("mottagare"));
        int amountIdx = headers.FindIndex(h => h.Contains("belopp") || h.Contains("summa") || h.Contains("amount"));

        if (dateIdx == -1 || descIdx == -1 || amountIdx == -1)
            return BadRequest(new { message = "Kunde inte hitta kolumner för Datum, Beskrivning och Belopp." });

        string? line;
        while ((line = await reader.ReadLineAsync()) != null)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            var cols = line.Split(separator).Select(c => c.Trim().Trim('"')).ToArray();
            if (cols.Length <= Math.Max(dateIdx, Math.Max(descIdx, amountIdx))) continue;

            string rawDate = cols[dateIdx];
            string rawDesc = cols[descIdx];
            string rawAmount = cols[amountIdx].Replace(" ", "").Replace("kr", "").Replace(',', '.');

            if (!DateTime.TryParse(rawDate, out DateTime dt) ||
                !decimal.TryParse(rawAmount, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal amt))
            {
                continue;
            }

            parsedRows.Add((DateTime.SpecifyKind(dt.Date, DateTimeKind.Utc), rawDesc, Math.Abs(amt)));
        }
    }

    if (!parsedRows.Any())
    {
        return BadRequest(new { message = "Inga giltiga transaktioner hittades." });
    }

    // 2. Hämta befintliga utgifter i databasen för tidsperioden
    var minDate = parsedRows.Min(r => r.Date).AddDays(-1);
    var maxDate = parsedRows.Max(r => r.Date).AddDays(1);

    var existingExpenses = await _context.Expenses
        .Where(e => e.Date >= minDate && e.Date <= maxDate)
        .ToListAsync();

    var categories = await _context.Categories.ToListAsync();
    var categoryNames = categories.Select(c => c.Name).ToList();
    var defaultCategory = categories.FirstOrDefault(c => c.Name.Equals("Övrigt", StringComparison.OrdinalIgnoreCase)) ?? categories.First();
    var foodCategory = categories.FirstOrDefault(c => c.Name.Equals("Livsmedel", StringComparison.OrdinalIgnoreCase) || c.Name.Equals("Mat", StringComparison.OrdinalIgnoreCase));

    var newExpenses = new List<Expense>();
    int duplicatesSkipped = 0;

    // 3. Filtrera bort dubbletter mot befintlig data och mot CSV-filen internt
    foreach (var row in parsedRows)
    {
        // Kontrollera om transaktionen redan finns i databasen
        bool existsInDb = existingExpenses.Any(e => 
            e.Date.Date == row.Date.Date && 
            e.Amount == row.Amount &&
            (
                e.Description.Equals(row.Description, StringComparison.OrdinalIgnoreCase) ||
                e.Description.ToLower().Contains(row.Description.ToLower()) ||
                row.Description.ToLower().Contains(e.Description.ToLower())
            ));

        // Kontrollera om samma transaktion förekommer flera gånger i samma CSV
        bool existsInBatch = newExpenses.Any(e => 
            e.Date.Date == row.Date.Date && 
            e.Amount == row.Amount && 
            e.Description.Equals(row.Description, StringComparison.OrdinalIgnoreCase));

        if (existsInDb || existsInBatch)
        {
            duplicatesSkipped++;
            continue;
        }

        newExpenses.Add(new Expense
        {
            Description = row.Description,
            Amount = row.Amount,
            Date = row.Date,
            CategoryId = defaultCategory.Id
        });
    }

    if (!newExpenses.Any())
    {
        return Ok(new 
        { 
            count = 0, 
            skipped = duplicatesSkipped, 
            message = $"Alla {duplicatesSkipped} transaktioner fanns redan registrerade och hoppades över." 
        });
    }

    // 4. Kör kategorisering (regelbaserat + AI) på kvarvarande unika rader
    var parallelOptions = new ParallelOptions { MaxDegreeOfParallelism = 2 };

    await Parallel.ForEachAsync(newExpenses, parallelOptions, async (expense, ct) =>
    {
        var descLower = expense.Description.ToLower();

        if (foodCategory != null && (
            descLower.Contains("ica") || descLower.Contains("malmborg") ||
            descLower.Contains("coop") || descLower.Contains("willys") ||
            descLower.Contains("lidl") || descLower.Contains("hemköp")))
        {
            expense.CategoryId = foodCategory.Id;
            return;
        }

        try
        {
            var predicted = await _aiService.CategorizeExpenseAsync(expense.Description, categoryNames);
            var match = categories.FirstOrDefault(c => c.Name.Equals(predicted, StringComparison.OrdinalIgnoreCase));
            if (match != null) expense.CategoryId = match.Id;
        }
        catch { }
    });

    _context.Expenses.AddRange(newExpenses);
    await _context.SaveChangesAsync();

    return Ok(new 
    { 
        count = newExpenses.Count, 
        skipped = duplicatesSkipped, 
        message = $"Importerade {newExpenses.Count} nya transaktioner ({duplicatesSkipped} dubbletter hoppades över)." 
    });
}
}