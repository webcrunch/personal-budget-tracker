using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;

namespace ExpenseApi.Services;

public class AiService
{
    private readonly HttpClient _httpClient;
    private readonly string _modelName;
    private readonly string _visionModelName;

    public AiService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _modelName = configuration["OLLAMA_MODEL"] ?? "llama3.2";
        _visionModelName = configuration["OLLAMA_VISION_MODEL"] ?? "minicpm-v";
    }

    public async Task<string> CategorizeExpenseAsync(string description, List<string> availableCategories)
    {
        try
        {
            string categoriesString = string.Join(", ", availableCategories);

            var requestBody = new
            {
                model = _modelName,
                prompt = $"Du är en budget-assistent. Kategorisera utgiften: '{description}'. " +
                         $"Du får ENDAST svara med ett av följande kategorinamn: {categoriesString}. " +
                         $"VIKTIGT: Om utgiften verkar vara från en restaurang, café, krog, snabbmat eller Foodora, välj 'Uteätande'. " +
                         $"Om det är dagligvaror från en livsmedelsbutik (t.ex. ICA, Coop, Willys), välj 'Mat'. " +
                         $"Om inget passar exakt, välj det som är närmast eller 'Övrigt'. Svara bara med ordet utan punkter.",
                stream = false
            };

            var response = await _httpClient.PostAsJsonAsync("api/generate", requestBody);

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<OllamaResponse>();
                var cleanResponse = result?.response?.Trim().TrimEnd('.');

                return string.IsNullOrEmpty(cleanResponse) ? "Övrigt" : cleanResponse;
            }

            Console.WriteLine($"Ollama svarade med felkod: {response.StatusCode}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"AI-fel vid kategorisering: {ex.Message}");
        }

        return "Övrigt";
    }

    public async Task<ParsedReceipt?> AnalyzeReceiptImageAsync(Stream imageStream)
    {
        try
        {
            // 1. Konvertera bildströmmen till Base64
            using var ms = new MemoryStream();
            await imageStream.CopyToAsync(ms);
            string base64Image = Convert.ToBase64String(ms.ToArray());

            // 2. Prompt optimerad för Kivra / svenska kvitton
            string prompt =
                "Du är en assistent specialiserad på svenska kvitton. Läs av bilden noga och returnera ett JSON-objekt med:\n" +
                "- store (butiksnamn, t.ex. 'ICA Kvantum Malmborgs Erikslust')\n" +
                "- date (datum i format YYYY-MM-DD)\n" +
                "- totalAmount (totalsumman att betala som decimaltal)\n" +
                "- totalDiscount (total rabatt som decimaltal, annars 0.0)\n" +
                "- items (lista av köpta artiklar med fälten 'name', 'price', 'discount', 'finalPrice')\n\n" +
                "Svara ENDAST med giltig JSON utan markdown-block eller text runt omkring.";

            var requestBody = new
            {
                model = _visionModelName,
                prompt = prompt,
                images = new[] { base64Image },
                format = "json",
                stream = false,
                options = new
                {
                    temperature = 0.1
                }
            };

            var response = await _httpClient.PostAsJsonAsync("api/generate", requestBody);

            if (response.IsSuccessStatusCode)
            {
                var ollamaResult = await response.Content.ReadFromJsonAsync<OllamaResponse>();
                if (!string.IsNullOrEmpty(ollamaResult?.response))
                {
                    var options = new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        NumberHandling = JsonNumberHandling.AllowReadingFromString
                    };

                    return JsonSerializer.Deserialize<ParsedReceipt>(ollamaResult.response, options);
                }
            }
            else
            {
                var err = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Ollama Vision svarade med felkod: {response.StatusCode}, Detaljer: {err}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"AI-fel vid kvittoanalys: {ex.Message}");
        }

        return null;
    }
}

public record OllamaResponse(string response);

public record ParsedReceipt(
    string? Store,
    string? Date,
    decimal TotalAmount,
    decimal TotalDiscount,
    List<ReceiptLineItem>? Items
);

public record ReceiptLineItem(
    string Name,
    decimal Price,
    decimal Discount,
    decimal FinalPrice
);