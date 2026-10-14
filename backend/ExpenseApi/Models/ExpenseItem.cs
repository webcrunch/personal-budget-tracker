using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace ExpenseApi.Models
{
    public class ExpenseItem
    {
        public int Id { get; set; }

        [Required]
        public required string Name { get; set; }

        public decimal Price { get; set; }

        public decimal Discount { get; set; }

        public decimal FinalPrice { get; set; }

        // Valfri kategori per delpost (t.ex. El vs Boende)
        public int? CategoryId { get; set; }

        [ForeignKey("CategoryId")]
        public virtual Category? Category { get; set; }

        // Koppling till huvudutgiften
        public int ExpenseId { get; set; }

        [JsonIgnore]
        [ForeignKey("ExpenseId")]
        public virtual Expense? Expense { get; set; }
    }
}