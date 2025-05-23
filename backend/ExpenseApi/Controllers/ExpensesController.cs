using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using ExpenseApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System;

namespace ExpenseApi.Controllers
{
    [Route("api/Expense")]
    [ApiController]
    public class ExpensesController : ControllerBase
    {
        private readonly ExpenseContext _context;

        public ExpensesController(ExpenseContext context)
        {
            _context = context;

            // Kontrollera om det finns några kategorier, annars lägg till standardkategorier
            if (!_context.Categories.Any())
            {
                _context.Categories.AddRange(
                    new Category { Name = "Mat" },
                    new Category { Name = "Transport" },
                    new Category { Name = "Boende" },
                    new Category { Name = "Nöje" }
                );
                _context.SaveChanges();
            }

            // Lägg till en initial utgift om databasen är tom
            // Se till att den refererar till en befintlig kategori (t.ex. "Uncategorized" eller "Mat")
            if (!_context.Expenses.Any())
            {
                var defaultCategory = _context.Categories.FirstOrDefault(c => c.Name == "Mat") ??
                                      _context.Categories.FirstOrDefault(); // Fallback om "Mat" inte finns

                if (defaultCategory != null)
                {
                    _context.Expenses.Add(new Expense
                    {
                        Description = "Initial Expense",
                        Amount = 10.00M,
                        Date = DateTime.UtcNow,
                        CategoryId = defaultCategory.Id // Använd CategoryId
                    });
                    _context.SaveChanges();
                }
            }
        }

        // GET: api/expenses (plural)
        // Hämtar alla utgifter från databasen, inklusive deras kategoriinformation
        [HttpGet("/api/expenses")]
        public async Task<ActionResult<IEnumerable<Expense>>> GetExpenses()
        {
            // Använd .Include() för att ladda den relaterade Category-informationen
            return await _context.Expenses.Include(e => e.Category).ToListAsync();
        }

        // GET: api/Expense/{id} (singular)
        // Hämtar en specifik utgift från databasen, inklusive dess kategoriinformation
        [HttpGet("{id}")]
        public async Task<ActionResult<Expense>> GetExpense(int id)
        {
            // Använd .Include() för att ladda den relaterade Category-informationen
            var expense = await _context.Expenses.Include(e => e.Category).FirstOrDefaultAsync(e => e.Id == id);

            if (expense == null)
            {
                return NotFound();
            }

            return expense;
        }

        // POST: api/Expense (singular)
        // Lägger till en ny utgift i databasen
        [HttpPost]
        public async Task<ActionResult<Expense>> PostExpense(Expense expense)
        {
            // EF Core kommer att hantera att spara Expense och dess CategoryId
            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();

            // Ladda kategorin för att returnera den fullständiga Expense-objektet
            await _context.Entry(expense).Reference(e => e.Category).LoadAsync();

            return CreatedAtAction(nameof(GetExpense), new { id = expense.Id }, expense);
        }

        // POST: api/expenses/batch
        // Lägger till flera utgifter i databasen
        [HttpPost("/api/expenses/batch")]
        public async Task<IActionResult> PostExpensesBatch([FromBody] List<Expense> expenses)
        {
            if (expenses == null || !expenses.Any())
            {
                return BadRequest("No expenses provided.");
            }
            _context.Expenses.AddRange(expenses);
            await _context.SaveChangesAsync();

            // Ladda kategoriinformation för varje expense
            foreach (var expense in expenses)
            {
                await _context.Entry(expense).Reference(e => e.Category).LoadAsync();
            }

            return Ok(expenses);
        }
    }
}
