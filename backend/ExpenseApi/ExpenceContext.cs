using Microsoft.EntityFrameworkCore;
using ExpenseApi.Models;

namespace ExpenseApi;

public class ExpenseContext : DbContext
{
    public ExpenseContext(DbContextOptions<ExpenseContext> options)
        : base(options)
    {
    }

    public DbSet<Expense> Expenses { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Budget> Budgets { get; set; } // Lade till DbSet för Budget
}
