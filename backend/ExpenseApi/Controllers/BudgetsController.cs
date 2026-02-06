using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using ExpenseApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System;

namespace ExpenseApi.Controllers
{
    // Basvägen för enskilda budgetoperationer (singular)
    [Route("api/Budget")] // Detta kommer att mappa till /api/Budget
    [ApiController]
    public class BudgetsController : ControllerBase
    {
        private readonly ExpenseContext _context;

        public BudgetsController(ExpenseContext context)
        {
            _context = context;

            // Valfritt: Lägg till en initial budget om databasen är tom (endast för utveckling)
            // if (!_context.Budgets.Any())
            // {
            //     // Förutsätter att du har en kategori med ID 1 (t.ex. "Mat")
            //     var defaultCategory = _context.Categories.FirstOrDefault(c => c.Name == "Mat");

            //     _context.Budgets.Add(new Budget
            //     {
            //         Name = "Månadsbudget Maj",
            //         Amount = 10000.00M,
            //         StartDate = new DateTime(2025, 5, 1, 0, 0, 0, DateTimeKind.Utc),
            //         EndDate = new DateTime(2025, 5, 31, 23, 59, 59, DateTimeKind.Utc),
            //         CategoryId = defaultCategory?.Id // Länka till kategori om den finns
            //     });
            //     _context.SaveChanges();
            // }
        }

        // GET: api/budgets (plural)
        // Hämtar alla budgetar från databasen, inklusive kategoriinformation
        [HttpGet("/api/budgets")]
        public async Task<ActionResult<IEnumerable<Budget>>> GetBudgets()
        {
            return await _context.Budgets.Include(b => b.Category).ToListAsync();
        }

        // GET: api/Budget/{id} (singular)
        // Hämtar en specifik budget från databasen, inklusive kategoriinformation
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

        // POST: api/Budget (singular)
        // Skapar en ny budget
        [HttpPost]
        public async Task<ActionResult<Budget>> PostBudget(Budget budget)
        {
            // 1. Säkerställ att ID är 0 så att databasen genererar ett nytt
            budget.Id = 0;

            // 2. Fixa tidszoner för Postgres
            budget.StartDate = DateTime.SpecifyKind(budget.StartDate, DateTimeKind.Utc);
            budget.EndDate = DateTime.SpecifyKind(budget.EndDate, DateTimeKind.Utc);

            // 3. Validera kategori
            if (budget.CategoryId.HasValue && !await _context.Categories.AnyAsync(c => c.Id == budget.CategoryId.Value))
            {
                ModelState.AddModelError("CategoryId", "Den angivna kategorin finns inte.");
                return BadRequest(ModelState);
            }

            // 4. SPARA ENDAST EN GÅNG
            _context.Budgets.Add(budget);
            await _context.SaveChangesAsync();

            // 5. Ladda kategorin för att returnera det fullständiga objektet till React
            await _context.Entry(budget).Reference(b => b.Category).LoadAsync();

            return CreatedAtAction(nameof(GetBudget), new { id = budget.Id }, budget);
        }

        // PUT: api/Budget/{id} (singular)
        // Uppdaterar en befintlig budget
        [HttpPut("{id}")]
        public async Task<IActionResult> PutBudget(int id, Budget budget)
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

            _context.Entry(budget).State = EntityState.Modified;

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
                else
                {
                    throw;
                }
            }

            return NoContent(); // Returnerar 204 No Content vid lyckad uppdatering
        }

        // DELETE: api/Budget/{id} (singular)
        // Tar bort en budget
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

            return NoContent(); // Returnerar 204 No Content vid lyckad borttagning
        }

        private bool BudgetExists(int id)
        {
            return _context.Budgets.Any(e => e.Id == id);
        }
    }
}
