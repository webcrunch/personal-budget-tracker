using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ExpenseApi.Services;
using ExpenseApi.Models;
using System.Text;

namespace ExpenseApi.Controllers;

[Route("api/[controller]")]
[ApiController]
public class InsightsController : ControllerBase
{
    private readonly ExpenseContext _context;
    private readonly AiService _aiService;

    public InsightsController(ExpenseContext context, AiService aiService)
    {
        _context = context;
        _aiService = aiService;
    }

    [HttpGet("coach")]
    public async Task<ActionResult<object>> GetCoachAdvice()
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTimeOffset(new DateTime(now.Year, now.Month, 1), TimeSpan.Zero);
        var daysInMonth = DateTime.DaysInMonth(now.Year, now.Month);
        var daysPassed = now.Day;
        var daysRemaining = Math.Max(0, daysInMonth - daysPassed);

        // Hämta denna månads utgifter
        var currentExpenses = await _context.Expenses
            .Include(e => e.Category)
            .Where(e => e.Date >= startOfMonth)
            .ToListAsync();

        // Hämta aktiva budgetar
        var budgets = await _context.Budgets
            .Include(b => b.Category)
            .Where(b => b.EndDate >= startOfMonth)
            .ToListAsync();

        var totalSpent = currentExpenses.Sum(e => e.Amount);
        var categoriesGrouped = currentExpenses
            .GroupBy(e => e.Category?.Name ?? "Övrigt")
            .Select(g => new { Category = g.Key, Total = g.Sum(x => x.Amount) })
            .OrderByDescending(g => g.Total)
            .Take(4)
            .ToList();

        // Sammanställ en koncis statusrapport för AI-modellen
        var sb = new StringBuilder();
        sb.AppendLine($"Idag är det dag {daysPassed} av {daysInMonth} i månaden ({daysRemaining} dagar kvar).");
        sb.AppendLine($"Totalt spenderat denna månad hittills: {totalSpent:0.00} kr.");
        
        sb.AppendLine("Största kategorierna hittills:");
        foreach (var cat in categoriesGrouped)
        {
            sb.AppendLine($"- {cat.Category}: {cat.Total:0.00} kr");
        }

        if (budgets.Any())
        {
            sb.AppendLine("Aktiva budgetar:");
            foreach (var b in budgets)
            {
                var spentInBudget = currentExpenses
                    .Where(e => b.CategoryId == null || e.CategoryId == b.CategoryId)
                    .Sum(e => e.Amount);
                var pct = b.Amount > 0 ? (spentInBudget / b.Amount) * 100 : 0;
                sb.AppendLine($"- {b.Name}: {spentInBudget:0.00} kr av {b.Amount:0.00} kr ({pct:0}% förbrukat)");
            }
        }
        else
        {
            sb.AppendLine("Inga specifika budgetar är uppsatta för tillfället.");
        }

        var advice = await _aiService.GenerateFinancialAdviceAsync(sb.ToString());

        return Ok(new { advice });
    }
}