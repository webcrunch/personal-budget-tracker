using Microsoft.EntityFrameworkCore;
using ExpenseApi.Models;

namespace ExpenseApi
{
    public class ExpenseContext : DbContext
    {
        // Korrigerad: DbContextOptions<ExpenseContext> options
        public ExpenseContext(DbContextOptions<ExpenseContext> options)
            : base(options)
        {
        }

        public DbSet<Expense> Expenses { get; set; }
    }
} // Lade till saknad klammerparentes för namespace
