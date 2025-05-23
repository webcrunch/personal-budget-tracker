using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ExpenseApi.Models
{
    public class Budget
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Budgetens namn är obligatoriskt.")]
        [MaxLength(200)]
        public required string Name { get; set; } // T.ex. "Matbudget Maj", "Total månadsbudget"

        [Required(ErrorMessage = "Budgetens belopp är obligatoriskt.")]
        [Range(0, double.MaxValue, ErrorMessage = "Budgetens belopp måste vara större än eller lika med noll.")]
        public decimal Amount { get; set; } // Budgeterat belopp

        [Required(ErrorMessage = "Startdatum är obligatoriskt.")]
        public DateTime StartDate { get; set; }

        [Required(ErrorMessage = "Slutdatum är obligatoriskt.")]
        public DateTime EndDate { get; set; }

        // Valfritt: Foreign Key till Category. Gör den nullable (int?) om inte alla budgetar är kategorispecifika.
        public int? CategoryId { get; set; }

        // Navigationsegenskap till Category-modellen
        [ForeignKey("CategoryId")]
        public virtual Category? Category { get; set; } // Kan vara null om budgeten är generell
    }
}
