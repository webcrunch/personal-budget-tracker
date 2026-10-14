using ExpenseApi;
using ExpenseApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Swashbuckle.AspNetCore.SwaggerGen;
using Swashbuckle.AspNetCore.SwaggerUI;
using System.Text.Json.Serialization;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// --- Registrera Health Checks i DI-containern ---
builder.Services.AddHealthChecks();

// --- Registrera AiService med Timeout på 3 minuter ---
builder.Services.AddHttpClient<AiService>(client =>
{
    // Hämta URL från miljövariabeln (med fallback till host.docker.internal:11435)
    var ollamaUrl = builder.Configuration.GetValue<string>("OLLAMA_URL") ?? "http://host.docker.internal:11435";
    client.BaseAddress = new Uri(ollamaUrl.TrimEnd('/') + "/");

    // Sätter timeout till 3 minuter så att tunga inferenser inte kastar fel
    client.Timeout = TimeSpan.FromMinutes(3);
});

// Hämta anslutningssträngen
var connectionString = builder.Configuration.GetValue<string>("CONNECTION_STRING")
                    ?? builder.Configuration.GetConnectionString("DefaultConnection");

// Lägg till DbContext med PostgreSQL
builder.Services.AddDbContext<ExpenseContext>(options =>
    options.UseNpgsql(connectionString));

// --- CORS-KONFIGURATION ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173", "http://localhost:3002", "http://localhost:3000")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// --- DATABASMIGRERINGAR & SMART SEED DATA ---
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ExpenseContext>();

    // Kör migreringar automatiskt
    dbContext.Database.Migrate();

    // Kategorier uppdelade i fasta och rörliga
    var defaultCategories = new (string Name, bool IsFixed)[]
    {
        ("Boende", true),
        ("El & Värme", true),
        ("Försäkringar", true),
        ("Abonnemang", true),
        ("Lån & Räntor", true),
        ("Transport", false),
        ("Drivmedel", false),
        ("Bilunderhåll", false),
        ("Livsmedel", false),
        ("Uteätande", false),
        ("Systembolaget", false),
        ("Kläder & Skor", false),
        ("Elektronik", false),
        ("Nöje", false),
        ("Husdjur", false),
        ("Hobby", false),
        ("Hälsa & Apotek", false),
        ("Träning", false),
        ("Sparande", false),
        ("Övrigt", false),
        ("Mat", false)
    };

    foreach (var cat in defaultCategories)
    {
        var existing = dbContext.Categories.FirstOrDefault(c => c.Name == cat.Name);
        if (existing == null)
        {
            dbContext.Categories.Add(new ExpenseApi.Models.Category { Name = cat.Name, IsFixed = cat.IsFixed });
        }
        else if (existing.IsFixed != cat.IsFixed)
        {
            // Uppdatera befintliga kategorier med rätt IsFixed-status
            existing.IsFixed = cat.IsFixed;
        }
    }

    dbContext.SaveChanges();
}

// VIKTIG ORDNING: CORS måste ligga före Authorization men efter Routing
app.UseRouting();

// Aktivera CORS
app.UseCors("AllowFrontend");

app.UseAuthorization();

// --- Healthcheck-endpoint ---
app.MapHealthChecks("/health");

// --- Kvittoanalys Endpoint ---
app.MapPost("/api/receipts/upload", async (IFormFile file, AiService aiService) =>
{
    if (file == null || file.Length == 0)
        return Results.BadRequest(new { error = "Ingen fil mottagen." });

    using var stream = file.OpenReadStream();
    var result = await aiService.AnalyzeReceiptImageAsync(stream);

    if (result == null)
        return Results.Problem("Kunde inte analysera kvittot från bilden.");

    return Results.Ok(result);
}).DisableAntiforgery();

app.MapControllers();

app.Run();