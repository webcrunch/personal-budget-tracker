using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using ExpenseApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System;

namespace ExpenseApi.Controllers
{
    [Route("api/[controller]")] // Mappar till /api/budgets
    [ApiController]
    public class BudgetsController : ControllerBase
    {
        private readonly ExpenseContext _context;

        public BudgetsController(ExpenseContext context)
        {
            _context = context;
        }

        // GET: api/budgets
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Budget>>> GetBudgets()
        {
            return await _context.Budgets.Include(b => b.Category).ToListAsync();
        }

        // GET: api/budgets/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Budget>> GetBudget(int id)
        {
            var budget = await _context.Budgets.Include(b => b.Category).FirstOrDefaultAsync(b => b.Id == id);

            if (budget == null)
            {
                return NotFound();
            }

            return budget;
        }

        // POST: api/budgets
        [HttpPost]
        public async Task<ActionResult<Budget>> PostBudget(Budget budget)
        {
            budget.Id = 0;

            budget.StartDate = DateTime.SpecifyKind(budget.StartDate, DateTimeKind.Utc);
            budget.EndDate = DateTime.SpecifyKind(budget.EndDate, DateTimeKind.Utc);

            if (budget.CategoryId.HasValue && !await _context.Categories.AnyAsync(c => c.Id == budget.CategoryId.Value))
            {
                ModelState.AddModelError("CategoryId", "Den angivna kategorin finns inte.");
                return BadRequest(ModelState);
            }

            _context.Budgets.Add(budget);
            await _context.SaveChangesAsync();

            await _context.Entry(budget).Reference(b => b.Category).LoadAsync();

            return CreatedAtAction(nameof(GetBudget), new { id = budget.Id }, budget);
        }

        // PUT: api/budgets/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> PutBudget(int id, [FromBody] Budget budget)
        {
            if (id != budget.Id)
            {
                return BadRequest("ID i URL matchar inte ID i budgetobjektet.");
            }

            if (budget.CategoryId.HasValue && !await _context.Categories.AnyAsync(c => c.Id == budget.CategoryId.Value))
            {
                ModelState.AddModelError("CategoryId", "Den angivna kategorin finns inte.");
                return BadRequest(ModelState);
            }

            var existing = await _context.Budgets.FindAsync(id);
            if (existing == null)
            {
                return NotFound();
            }

            existing.Name = budget.Name;
            existing.Amount = budget.Amount;
            existing.StartDate = DateTime.SpecifyKind(budget.StartDate, DateTimeKind.Utc);
            existing.EndDate = DateTime.SpecifyKind(budget.EndDate, DateTimeKind.Utc);
            existing.CategoryId = budget.CategoryId;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!BudgetExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        // DELETE: api/budgets/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBudget(int id)
        {
            var budget = await _context.Budgets.FindAsync(id);
            if (budget == null)
            {
                return NotFound();
            }

            _context.Budgets.Remove(budget);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool BudgetExists(int id)
        {
            return _context.Budgets.Any(e => e.Id == id);
        }
    }
}