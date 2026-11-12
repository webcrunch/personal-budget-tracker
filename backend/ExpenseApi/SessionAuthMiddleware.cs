using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;

namespace ExpenseApi.Services;

// Alla anrop under /api kräver inloggning: samma magiska länk via Telegram som admin på
// jarllindquist.com. Frontend skickar sessionen som X-Admin-Session, och n8n-webhooken
// session-check svarar om den är giltig för just det här systemet (app "budget", så att en
// session från cv-admin inte gäller här) och förnyar den i 15 minuter. Svaret sparas en minut,
// så att n8n inte får ett anrop per klick. Går n8n inte att nå nekas anropet (fail closed).
public class SessionAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SessionAuthMiddleware> _logger;
    private readonly string _checkUrl;
    private readonly string _app;
    private readonly bool _disabled;

    public SessionAuthMiddleware(RequestDelegate next, IMemoryCache cache, IHttpClientFactory httpClientFactory,
        ILogger<SessionAuthMiddleware> logger, IConfiguration configuration, IWebHostEnvironment environment)
    {
        _next = next;
        _cache = cache;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _checkUrl = configuration["SESSION_CHECK_URL"] ?? "https://jarllindquist.com/n8n/webhook/session-check";
        _app = configuration["SESSION_APP"] ?? "budget";
        // Bara lokalt: DISABLE_AUTH=true stänger av kontrollen, aldrig i produktion
        _disabled = environment.IsDevelopment() && configuration["DISABLE_AUTH"] == "true";
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (_disabled || !context.Request.Path.StartsWithSegments("/api") || HttpMethods.IsOptions(context.Request.Method))
        {
            await _next(context);
            return;
        }

        var session = context.Request.Headers["X-Admin-Session"].ToString();
        if (string.IsNullOrWhiteSpace(session) || session.Length > 200 || !await IsValidAsync(session, context.RequestAborted))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "unauthorized" });
            return;
        }

        await _next(context);
    }

    private async Task<bool> IsValidAsync(string session, CancellationToken cancellationToken)
    {
        // Nyckeln är en hash av sessionen, så att själva sessionen inte ligger i minnet som nyckel
        var key = "session:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(session)));
        if (_cache.TryGetValue(key, out bool cached)) return cached;

        try
        {
            var client = _httpClientFactory.CreateClient("session-check");
            using var request = new HttpRequestMessage(HttpMethod.Post, _checkUrl);
            request.Headers.Add("X-Admin-Session", session);
            request.Content = JsonContent.Create(new { app = _app });
            using var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("session-check svarade {Status}", (int)response.StatusCode);
                return false; // sparas inte: nästa anrop frågar igen
            }

            var result = await response.Content.ReadFromJsonAsync<SessionCheckResult>(cancellationToken);
            var valid = result?.Valid == true;
            // En giltig session sparas en minut, en ogiltig kort tid
            _cache.Set(key, valid, valid ? TimeSpan.FromSeconds(60) : TimeSpan.FromSeconds(10));
            return valid;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException)
        {
            _logger.LogWarning(ex, "session-check gick inte att nå");
            return false;
        }
    }

    private sealed record SessionCheckResult([property: JsonPropertyName("valid")] bool Valid);
}
