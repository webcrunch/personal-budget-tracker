using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using ExpenseApi;
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
    private readonly AiService _aiService; // Lägg till tjänsten här

    public ExpensesController(ExpenseContext context, AiService aiService)
    {
        _context = context;
        _aiService = aiService;

        // Seed-logik för kategorier
        if (!_context.Categories.Any())
        {
            _context.Categories.AddRange(
                new Category { Name = "Mat" },
                new Category { Name = "Transport" },
                new Category { Name = "Boende" },
                new Category { Name = "Nöje" },
                new Category { Name = "Övrigt" }
            );
            _context.SaveChanges();
        }
    }

    [HttpGet("/api/expenses")]
    public async Task<ActionResult<IEnumerable<Expense>>> GetExpenses()
    {
        return await _context.Expenses.Include(e => e.Category).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Expense>> GetExpense(int id)
    {
        var expense = await _context.Expenses.Include(e => e.Category).FirstOrDefaultAsync(e => e.Id == id);
        if (expense == null) return NotFound();
        return expense;
    }

    // --- EN GEMENSAM POST-METOD ---
    [HttpPost]
    public async Task<ActionResult<Expense>> PostExpense(Expense expense)
    {
        // 1. Om CategoryId saknas (0), låt AI:n gissa
        if (expense.CategoryId == 0)
        {
            var guessedCategoryName = await _aiService.CategorizeExpenseAsync(expense.Description);

            // Hitta kategorin i databasen baserat på AI:ns svar
            var category = await _context.Categories
                .FirstOrDefaultAsync(c => c.Name.ToLower() == guessedCategoryName.ToLower());

            // Om vi hittade en match, sätt ID:t, annars använd "Övrigt" eller första bästa
            if (category != null)
            {
                expense.CategoryId = category.Id;
            }
            else
            {
                var fallback = await _context.Categories.FirstOrDefaultAsync(c => c.Name == "Övrigt");
                if (fallback != null) expense.CategoryId = fallback.Id;
            }
        }

        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();

        // Ladda kategoriobjektet så att frontenden får namnet direkt
        await _context.Entry(expense).Reference(e => e.Category).LoadAsync();

        return CreatedAtAction(nameof(GetExpense), new { id = expense.Id }, expense);
    }

    [HttpPost("/api/expenses/batch")]
    public async Task<IActionResult> PostExpensesBatch([FromBody] List<Expense> expenses)
    {
        if (expenses == null || !expenses.Any()) return BadRequest("No expenses provided.");

        _context.Expenses.AddRange(expenses);
        await _context.SaveChangesAsync();

        foreach (var expense in expenses)
        {
            await _context.Entry(expense).Reference(e => e.Category).LoadAsync();
        }

        return Ok(expenses);
    }
}
