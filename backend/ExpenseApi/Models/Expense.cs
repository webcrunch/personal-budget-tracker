using System;
using System.ComponentModel.DataAnnotations;

namespace ExpenseApi.Models
{
    public class Expense
    {
        public int Id { get; set; }

        // Korrigerad: Använder 'required' för icke-nullbara egenskaper i C# 11+
        [Required]
        public required string Description { get; set; }

        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Amount must be greater than zero.")]
        public decimal Amount { get; set; }

        [Required]
        public DateTime Date { get; set; }

        // Korrigerad: Använder 'required' för icke-nullbara egenskaper i C# 11+
        [Required]
        public required string Category { get; set; }
    }
}