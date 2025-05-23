using System.ComponentModel.DataAnnotations;

namespace ExpenseApi.Models
{
    public class Category
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)] // Begränsar längden på kategorinamnet
        public required string Name { get; set; }
    }
}
