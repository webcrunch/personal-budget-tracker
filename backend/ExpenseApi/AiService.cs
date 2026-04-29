using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;

namespace ExpenseApi.Services;

public class AiService
{
    private readonly HttpClient _httpClient;
    private readonly string _modelName;

    public AiService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;

        // Vi läser in URL och Modell från miljövariabler/konfiguration
        // Default-värden om variablerna saknas:
        var baseUrl = configuration["OLLAMA_URL"] ?? "http://ollama:11434/";
        _modelName = configuration["OLLAMA_MODEL"] ?? "llama3.2";

        _httpClient.BaseAddress = new Uri(baseUrl);
    }

    public async Task<string> CategorizeExpenseAsync(string description, List<string> availableCategories)
    {
        try
        {
            // Slå ihop listan till en sträng för prompten
            string categoriesString = string.Join(", ", availableCategories);

            var requestBody = new
            {
                model = _modelName,
                prompt = $"Du är en budget-assistent. Kategorisera utgiften: '{description}'. " +
                         $"Du får ENDAST svara med ett av följande kategorinamn: {categoriesString}. " +
                         $"Om inget passar exakt, välj det som är närmast eller 'Övrigt'. Svara bara med ordet.",
                stream = false
            };

            var response = await _httpClient.PostAsJsonAsync("api/generate", requestBody);

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<OllamaResponse>();

                // Städa svaret (trimma bort whitespaces och eventuella avslutande punkter)
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
}

public record OllamaResponse(string response);