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

        // Modellen läser vi fortfarande in här, med llama3.2 som fallback
        _modelName = configuration["OLLAMA_MODEL"] ?? "llama3.2";

        // NOTERA: _httpClient.BaseAddress är nu borttagen härifrån!
        // Den sätts istället automatiskt centralt via AddHttpClient i Program.cs.
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
                         $"Om inget passar exakt, välj det som är närmast eller 'Övrigt'. Svara bara med ordet.",
                stream = false
            };

            // Eftersom BaseAddress är inställd på "http://ollama:11434/" (eller localhost)
            // kommer detta anrop att skickas till "http://ollama:11434/api/generate"
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
}

public record OllamaResponse(string response);