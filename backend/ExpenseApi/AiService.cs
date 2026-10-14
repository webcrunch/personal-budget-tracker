using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
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

            var foodCategory = availableCategories.FirstOrDefault(c =>
                c.Equals("Mat", StringComparison.OrdinalIgnoreCase) ||
                c.Equals("Livsmedel", StringComparison.OrdinalIgnoreCase) ||
                c.Equals("Mat & Livsmedel", StringComparison.OrdinalIgnoreCase)) ?? "Mat";

            var restaurantCategory = availableCategories.FirstOrDefault(c =>
                c.Equals("Uteätande", StringComparison.OrdinalIgnoreCase) ||
                c.Equals("Restaurang", StringComparison.OrdinalIgnoreCase)) ?? "Uteätande";

            var requestBody = new
            {
                model = _modelName,
                prompt = $"Du är en budget-assistent. Kategorisera utgiften: '{description}'.\n" +
                         $"Du får ENDAST svara med EXAKT ett av följande kategorinamn som finns i listan: {categoriesString}.\n" +
                         $"VIKTIGA REGLER:\n" +
                         $"Om utgiften verkar vara från en restaurang, café, krog, snabbmat eller Foodora, välj '{restaurantCategory}'.\n" +
                         $"Om det är dagligvaror, mat, kvitto från en mataffär eller livsmedel (t.ex. köttbullar, ketchup, ICA, Malmborgs, Coop, Willys, Lidl), välj '{foodCategory}'.\n" +
                         $"Svara BARA med kategorinamnet utan citationstecken, markdown eller punkter.",
                stream = false,
                options = new
                {
                    temperature = 0.1
                }
            };

            var response = await _httpClient.PostAsJsonAsync("api/generate", requestBody);

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<OllamaResponse>();
                var cleanResponse = result?.response?.Trim().TrimEnd('.', '"', ' ');

                return string.IsNullOrEmpty(cleanResponse) ? (availableCategories.FirstOrDefault() ?? "Övrigt") : cleanResponse;
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
            using var ms = new MemoryStream();
            await imageStream.CopyToAsync(ms);
            string base64Image = Convert.ToBase64String(ms.ToArray());

            string prompt =
                "Du är en assistent specialiserad på svenska kvitton, fakturor och hyresavier.\n" +
                "Extrahera informationen till JSON med följande struktur:\n" +
                "- store: Föreningens/värdens namn eller typ (t.ex. 'Brf Månadsavi' eller 'Hyresavi').\n" +
                "- date: Förfallodatum eller periodens startdatum i formatet YYYY-MM-DD.\n" +
                "- totalAmount: Totalsumma att betala (Summa).\n" +
                "- items: Lista av specifikationsrader. För varje rad:\n" +
                "  * name: T.ex. 'Årsavgift bostad' eller 'El IMD (augusti, 129.4 kWh)'\n" +
                "  * finalPrice: Beloppet för raden. VIKTIGT: Om det finns moms för elen (t.ex. El 256 kr + Moms 64 kr), räkna in momsen i elradens finalPrice (256 + 64 = 320 kr).\n" +
                "- isPending: Sätt till true om datumet ligger framåt i tiden.\n\n" +
                "STRÄNGA REGLER:\n" +
                "Ta inte med rena summeringsrader ('Summa', 'Totalt') i items-listan.\n" +
                "Svara ENDAST med giltig JSON.";

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

                    var parsed = JsonSerializer.Deserialize<ParsedReceipt>(ollamaResult.response, options);

                    if (parsed != null)
                    {
                        var cleanStore = parsed.Store ?? "";
                        cleanStore = Regex.Replace(cleanStore, @"[*_#]", "").Trim();

                        if (Regex.IsMatch(cleanStore, @"malmbo[r]?g[r]?s", RegexOptions.IgnoreCase) ||
                            cleanStore.Contains("Erikslust", StringComparison.OrdinalIgnoreCase))
                        {
                            cleanStore = "ICA Malmborgs Erikslust";
                        }

                        var cleanedItems = new List<ReceiptLineItem>();
                        if (parsed.Items != null && parsed.Items.Any())
                        {
                            var stopWords = new[]
                            {
                                "att betala", "kort", "kontant", "totalt", "summa",
                                "moms", "subtotal", "avrundning", "kört", "mastercard", "visa"
                            };

                            cleanedItems = parsed.Items
                                .Where(item =>
                                {
                                    if (string.IsNullOrWhiteSpace(item.Name)) return false;
                                    var nameLower = item.Name.ToLower().Trim();

                                    bool containsStopWord = stopWords.Any(w => nameLower.Contains(w));
                                    bool isIdenticalToTotal = parsed.Items.Count > 1 && item.FinalPrice == parsed.TotalAmount;

                                    return !(containsStopWord || isIdenticalToTotal);
                                })
                                .ToList();
                        }

                        return parsed with 
                        { 
                            Store = cleanStore,
                            Items = cleanedItems
                        };
                    }
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

    public async Task<string> GenerateFinancialAdviceAsync(string financialSummaryText)
    {
        try
        {
            var prompt = 
                "Du är en professionell och klarsynt privatekonomisk rådgivare.\n" +
                "Analysera följande ekonomiska status för månaden:\n\n" +
                $"{financialSummaryText}\n\n" +
                "Skriv 2–3 korta, analytiska och konkreta punkter under 'Tänk på detta'.\n\n" +
                "STRIKTA REGLER:\n" +
                "- Upprepa ALDRIG samma fras eller rekommendation i flera punkter.\n" +
                "- Förbjudna fraser: 'Det kan vara värt att undersöka', 'möjligheter att minska utgifterna'.\n" +
                "- Sätt siffrorna i relation till hur många dagar som gått och vad som är rimligt (t.ex. 99 kr uteätande är inte ett problem).\n" +
                "- Om en budget ser sund ut eller om en utgift är helt normal, konstatera det kort.\n" +
                "- Fokusera på faktisk förbrukningstakt: ligger man före eller efter plan?\n" +
                "- Skriv på ledig och professionell svenska i punktform (börja med '- ').";

            var requestBody = new
            {
                model = _modelName,
                prompt = prompt,
                stream = false,
                options = new
                {
                    temperature = 0.4
                }
            };

            var response = await _httpClient.PostAsJsonAsync("api/generate", requestBody);
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<OllamaResponse>();
                return result?.response?.Trim() ?? "Inga särskilda avvikelser hittades just nu.";
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Kunde inte generera råd: {ex.Message}");
        }

        return "Kunde inte generera råd just nu. Kontrollera att AI-tjänsten är igång.";
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