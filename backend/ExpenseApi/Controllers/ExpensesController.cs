using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using ExpenseApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System;

namespace ExpenseApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ExpensesController : ControllerBase
    {
        private readonly ExpenseContext _context;

        public ExpensesController(ExpenseContext context)
        {
            _context = context;
            if (_context.Expenses.Any() == false)
            {
                _context.Expenses.Add(new Expense { Description = "Initial Expense", Amount = 10.00M, Date = DateTime.UtcNow, Category = "Uncategorized" });
                _context.SaveChanges();
            }
        }

        // GET: api/Expenses
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Expense>>> GetExpenses()
        {
            return await _context.Expenses.ToListAsync();
        }

        // GET: api/Expenses/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Expense>> GetExpense(int id)
        {
            var expense = await _context.Expenses.FindAsync(id);

            if (expense == null)
            {
                return NotFound();
            }

            return expense;
        }

        // POST: api/Expenses
        [HttpPost]
        public async Task<ActionResult<Expense>> PostExpense(Expense expense)
        {
            if (expense == null)
            {
                return BadRequest("Expense is null.");
            }
            if (expense.Date == default)
            {
                return BadRequest("Invalid or missing date. Date must be in ISO format, e.g. 2024-01-20.");
            }
            // Ensure Date is in UTC
            if (expense.Date.Kind == DateTimeKind.Unspecified)
            {
                expense.Date = DateTime.SpecifyKind(expense.Date, DateTimeKind.Utc);
            }
            else if (expense.Date.Kind == DateTimeKind.Local)
            {
                expense.Date = expense.Date.ToUniversalTime();
            }
            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetExpense), new { id = expense.Id }, expense);
        }

        // POST: api/Expenses/batch
        [HttpPost("batch")]
        public async Task<IActionResult> PostExpenses([FromBody] List<Expense> expenses)
        {
            if (expenses == null || !expenses.Any())
            {
                return BadRequest("No expenses provided.");
            }
            // Ensure all Dates are in UTC
            foreach (var expense in expenses)
            {
                if (expense.Date.Kind == DateTimeKind.Unspecified)
                {
                    expense.Date = DateTime.SpecifyKind(expense.Date, DateTimeKind.Utc);
                }
                else if (expense.Date.Kind == DateTimeKind.Local)
                {
                    expense.Date = expense.Date.ToUniversalTime();
                }
            }
            _context.Expenses.AddRange(expenses);
            await _context.SaveChangesAsync();
            return Ok(expenses);
        }
    }
}
