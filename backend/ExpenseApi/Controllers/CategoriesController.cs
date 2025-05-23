using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ExpenseApi.Models; // Se till att inkludera din Models-namespace
using Microsoft.EntityFrameworkCore; // För databasoperationer

namespace ExpenseApi.Controllers
{
    // Basvägen för enskilda kategorier (singular)
    [Route("api/Category")] // Detta kommer att mappa till /api/Category
    [ApiController] // Anger att detta är en API-controller
    public class CategoriesController : ControllerBase
    {
        private readonly ExpenseContext _context; // Injicera databaskontexten

        public CategoriesController(ExpenseContext context)
        {
            _context = context;

            // Valfritt: Lägg till några initiala kategorier om databasen är tom
            // Detta körs varje gång kontrollern initieras, så det är bäst för utveckling.
            // I produktion skulle du ha en mer robust seedning.
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
        }

        // GET: api/categories (plural)
        // Hämtar alla kategorier från databasen
        [HttpGet("/api/categories")]
        public async Task<ActionResult<IEnumerable<Category>>> GetCategories()
        {
            return await _context.Categories.ToListAsync(); // Hämta från databasen
        }

        // GET: api/Category/{name} (singular)
        // Hämtar en specifik kategori från databasen
        [HttpGet("{name}")]
        public async Task<ActionResult<Category>> GetCategory(string name)
        {
            var category = await _context.Categories.FirstOrDefaultAsync(c => c.Name.ToLower() == name.ToLower());
            if (category == null)
            {
                return NotFound();
            }
            return Ok(category);
        }

        // POST: api/Category (singular)
        // Lägger till en ny kategori i databasen
        [HttpPost]
        public async Task<ActionResult<Category>> PostCategory([FromBody] Category newCategory) // Tar emot ett Category-objekt
        {
            if (string.IsNullOrWhiteSpace(newCategory.Name))
            {
                return BadRequest("Kategorinamn kan inte vara tomt.");
            }

            if (await _context.Categories.AnyAsync(c => c.Name.ToLower() == newCategory.Name.ToLower()))
            {
                return Conflict("Kategorin finns redan.");
            }

            _context.Categories.Add(newCategory); // Lägger till i databasen
            await _context.SaveChangesAsync(); // Sparar ändringarna

            // Returnerar 201 Created och den nyskapade kategorin
            return CreatedAtAction(nameof(GetCategory), new { name = newCategory.Name }, newCategory);
        }

        // DELETE: api/Category/{name} (singular)
        // Tar bort en kategori från databasen
        [HttpDelete("{name}")]
        public async Task<IActionResult> DeleteCategory(string name)
        {
            var categoryToRemove = await _context.Categories.FirstOrDefaultAsync(c => c.Name.ToLower() == name.ToLower());
            if (categoryToRemove == null)
            {
                return NotFound();
            }

            _context.Categories.Remove(categoryToRemove); // Tar bort från databasen
            await _context.SaveChangesAsync(); // Sparar ändringarna
            return NoContent();
        }
    }
}