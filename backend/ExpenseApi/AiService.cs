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

    public async Task<string> CategorizeExpenseAsync(string description, List<string> availableCategories)
    {
        try
        {
            // 1. Slå ihop listan till en sträng: "Mat, Transport, Husdjur, Abonnemang..."
            string categoriesString = string.Join(", ", availableCategories);

            // mistral

            var requestBody = new
            {
                model = "gemma4:e4b",
                // 2. Använd den dynamiska strängen i prompten
                prompt = $"Du är en budget-assistent. Kategorisera utgiften: '{description}'. " +
                 $"Du får ENDAST svara med ett av följande kategorinamn: {categoriesString}. " +
                 $"Om inget passar exakt, välj det som är närmast eller 'Övrigt'. Svara bara med ordet.",
                stream = false
            };

            var response = await _httpClient.PostAsJsonAsync("api/generate", requestBody);

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<OllamaResponse>();
                // 3. Städa svaret (ibland lägger AI till punkter eller mellanslag)
                var cleanResponse = result?.response?.Trim().TrimEnd('.');
                return cleanResponse ?? "Övrigt";
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"AI-fel: {ex.Message}");
        }

        return "Övrigt";
    }
}

public record OllamaResponse(string response);