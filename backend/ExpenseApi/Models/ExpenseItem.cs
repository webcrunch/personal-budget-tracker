using System.Text.Json.Serialization;

namespace ExpenseApi.Models;

public class ExpenseItem
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal Discount { get; set; }
    public decimal FinalPrice { get; set; }

    // Koppling till huvudutgiften
    public int ExpenseId { get; set; }

    [JsonIgnore]
    public Expense? Expense { get; set; }
}