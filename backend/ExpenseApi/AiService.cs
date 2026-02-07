using System.Net.Http.Json;

namespace ExpenseApi.Services;

public class AiService
{
    private readonly HttpClient _httpClient;

    public AiService(HttpClient httpClient)
    {
        _httpClient = httpClient;
        // Vi använder containernamnet 'ollama' som host
        _httpClient.BaseAddress = new Uri("http://ollama:11434/");
    }

    public async Task<string> CategorizeExpenseAsync(string description)
    {
        try
        {
            var requestBody = new
            {
                model = "mistral",
                prompt = $"Kategorisera denna utgift: '{description}'. Svara ENDAST med ett av dessa ord: Mat, Transport, Boende, Nöje, Övrigt.",
                stream = false
            };

            var response = await _httpClient.PostAsJsonAsync("api/generate", requestBody);

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<OllamaResponse>();
                return result?.response?.Trim() ?? "Övrigt";
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"AI-fel: {ex.Message}");
        }

        return "Övrigt"; // Fallback om AI:n är upptagen eller nere
    }
}

public record OllamaResponse(string response);