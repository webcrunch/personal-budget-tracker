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
                c.Equals("Livsmedel", StringComparison.OrdinalIgnoreCase) ||
                c.Equals("Mat", StringComparison.OrdinalIgnoreCase)) ?? "Livsmedel";

            var restaurantCategory = availableCategories.FirstOrDefault(c =>
                c.Equals("Uteätande", StringComparison.OrdinalIgnoreCase)) ?? "Uteätande";

            var pharmacyCategory = availableCategories.FirstOrDefault(c =>
                c.Equals("Hälsa & Apotek", StringComparison.OrdinalIgnoreCase)) ?? "Hälsa & Apotek";

            var insuranceCategory = availableCategories.FirstOrDefault(c =>
                c.Equals("Försäkringar", StringComparison.OrdinalIgnoreCase)) ?? "Försäkringar";

            var subscriptionCategory = availableCategories.FirstOrDefault(c =>
                c.Equals("Abonnemang", StringComparison.OrdinalIgnoreCase)) ?? "Abonnemang";

            var housingCategory = availableCategories.FirstOrDefault(c =>
                c.Equals("Boende", StringComparison.OrdinalIgnoreCase)) ?? "Boende";

            var systembolagetCategory = availableCategories.FirstOrDefault(c =>
                c.Equals("Systembolaget", StringComparison.OrdinalIgnoreCase)) ?? "Systembolaget";

            var requestBody = new
            {
                model = _modelName,
                prompt = $"Du är en budget-assistent. Kategorisera utgiften eller varan: '{description}'.\n" +
                         $"Du får ENDAST svara med EXAKT ett av följande kategorinamn: {categoriesString}.\n\n" +
                         $"VIKTIGA REGLER:\n" +
                         $"- Om utgiften rör a-kassa (t.ex. Akademikernas a-kassa, Unionen, Alfa-kassan, Kommunal, IF Metall), fackföreningsavgift eller försäkring: välj '{insuranceCategory}'. Välj ALDRIG '{foodCategory}'.\n" +
                         $"- Om utgiften är månadsavgift, hyra, bostadsrätt eller Brf-avi: välj '{housingCategory}'.\n" +
                         $"- Om varan är hårvax, schampo, balsam, tvål, tandkräm, hudvård, medicin eller apoteksvaror: välj '{pharmacyCategory}'.\n" +
                         $"- Om utgiften är från restaurang, café, krog, snabbmat eller Foodora: välj '{restaurantCategory}'.\n" +
                         $"- Om utgiften är alkohol eller från Systembolaget: välj '{systembolagetCategory}'.\n" +
                         $"- Om varan är ätbar mat eller dryck från en matbutik: välj '{foodCategory}'.\n" +
                         $"- Om det är diskmedel, toapapper, tvättmedel eller hushållsartiklar: välj 'Övrigt'.\n" +
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
                "Du är en expert på svenska kvitton, fakturor och hyresavier (Brf, A-kassa, ICA m.fl.).\n" +
                "Extrahera informationen till ren JSON med fälten: store, date, totalAmount, totalDiscount, isFixed, isPending, items.\n\n" +
                "GILTIGA KATEGORIER FÖR 'suggestedCategory':\n" +
                "- 'Boende' (månadsavgift, hyra)\n" +
                "- 'El & Värme' (el, IMD)\n" +
                "- 'Försäkringar' (A-kassa, fackavgift, hemförsäkring, personförsäkring)\n" +
                "- 'Abonnemang' (bredband, streaming, mobil)\n" +
                "- 'Livsmedel' (matvaror, snacks)\n" +
                "- 'Hälsa & Apotek' (hårvax, schampo, tvål, medicin)\n" +
                "- 'Övrigt' (hushåll, städ)\n\n" +
                "REGLER FÖR FAKTUROR OCH AVsound:\n" +
                "1. Om det är en avi/faktura (t.ex. Brf, Hyra, El, A-kassa): Sätt 'isFixed': true och 'isPending': true.\n" +
                "2. Om det är en a-kassa (t.ex. Akademikernas a-kassa): Sätt 'store' till A-kassans namn och 'suggestedCategory' till 'Försäkringar'. Välj ALDRIG 'Livsmedel'.\n" +
                "3. För Brf-avier: Slå ihop El och dess moms till en rad (256 + 64 = 320 kr).\n" +
                "4. Läs alltid beloppet längst ut till HÖGER på varje rad.\n\n" +
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
                    options.Converters.Add(new LenientDecimalConverter());

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
                                "subtotal", "avrundning", "kört", "mastercard", "visa"
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

                            // 1. Slå ihop eventuell separat moms-rad med El IMD
                            var vatItem = cleanedItems.FirstOrDefault(i => i.Name.ToLower().Contains("moms"));
                            var elItem = cleanedItems.FirstOrDefault(i => i.Name.ToLower().Contains("el") || i.Name.ToLower().Contains("imd"));

                            if (vatItem != null && elItem != null)
                            {
                                elItem.FinalPrice += vatItem.FinalPrice;
                                elItem.Price = elItem.FinalPrice;
                                cleanedItems.Remove(vatItem);
                            }

                            // 2. EXAKT MATEMATISK TILLSLUTNING FÖR AVIER
                            if (parsed.TotalAmount > 0)
                            {
                                var rentItem = cleanedItems.FirstOrDefault(i => 
                                    i.Name.Contains("avgift", StringComparison.OrdinalIgnoreCase) || 
                                    i.Name.Contains("hyra", StringComparison.OrdinalIgnoreCase) || 
                                    i.Name.Contains("bostad", StringComparison.OrdinalIgnoreCase));

                                var currentElItem = cleanedItems.FirstOrDefault(i => 
                                    i.Name.Contains("el", StringComparison.OrdinalIgnoreCase) || 
                                    i.Name.Contains("imd", StringComparison.OrdinalIgnoreCase));

                                if (rentItem != null && currentElItem != null)
                                {
                                    // Tvinga elen till det exakta restvärdet: 4 668 - 4 348 = 320 kr
                                    currentElItem.FinalPrice = parsed.TotalAmount - rentItem.FinalPrice;
                                    currentElItem.Price = currentElItem.FinalPrice;
                                }
                            }
                        }

                        // Automatisk flaggning om avsändaren är en a-kassa eller förening
                        bool isFixedDetected = parsed.IsFixed || 
                            cleanStore.Contains("a-kassa", StringComparison.OrdinalIgnoreCase) ||
                            cleanStore.Contains("brf", StringComparison.OrdinalIgnoreCase) ||
                            cleanStore.Contains("avi", StringComparison.OrdinalIgnoreCase);

                        return parsed with 
                        { 
                            Store = cleanStore,
                            IsFixed = isFixedDetected,
                            IsPending = parsed.IsPending || isFixedDetected,
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
    bool IsFixed,
    bool IsPending,
    List<ReceiptLineItem>? Items
);

public class ReceiptLineItem
{
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal Discount { get; set; }
    public decimal FinalPrice { get; set; }
    public string? SuggestedCategory { get; set; }
}

public class LenientDecimalConverter : JsonConverter<decimal>
{
    public override decimal Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Number)
        {
            return reader.GetDecimal();
        }

        if (reader.TokenType == JsonTokenType.String)
        {
            string? str = reader.GetString();
            if (string.IsNullOrWhiteSpace(str)) return 0m;

            str = str.Replace(" ", "").Replace("kr", "", StringComparison.OrdinalIgnoreCase).Trim();
            str = str.Replace(",", ".");

            var match = System.Text.RegularExpressions.Regex.Match(str, @"-?\d+(\.\d+)?");
            if (match.Success && decimal.TryParse(match.Value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var val))
            {
                return val;
            }
        }

        return 0m;
    }

    public override void Write(Utf8JsonWriter writer, decimal value, JsonSerializerOptions options)
    {
        writer.WriteNumberValue(value);
    }
}