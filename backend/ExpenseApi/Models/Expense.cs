using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; // För [ForeignKey]

namespace ExpenseApi.Models
{
    public class Expense
    {
        public int Id { get; set; }

        [Required]
        public required string Description { get; set; }

        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Amount must be greater than zero.")]
        public decimal Amount { get; set; }

        [Required]
        public DateTimeOffset Date { get; set; }

        // Foreign Key för Category
        [Required]
        public int CategoryId { get; set; }

        // Navigationsegenskap till Category-modellen
        [ForeignKey("CategoryId")]
        public virtual Category? Category { get; set; }

        // Navigationsegenskap till de enskilda kvittoraderna
        public virtual ICollection<ExpenseItem> Items { get; set; } = new List<ExpenseItem>();
    }
}