using ExpenseApi;
using ExpenseApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using Swashbuckle.AspNetCore.SwaggerUI;
using System.Text.Json.Serialization;
using System.Linq; // Viktigt för att kunna använda .Any() och .Count()

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

// --- NYTT: Registrera Health Checks i DI-containern ---
builder.Services.AddHealthChecks();

// --- ÄNDRAT: Registrera AiService med en specifik Timeout på 3 minuter ---
builder.Services.AddHttpClient<AiService>(client =>
{
    // Hämta URL från miljövariabeln (eller kör fallback till localhost vid lokal dev)
    var ollamaUrl = builder.Configuration.GetValue<string>("OLLAMA_URL") ?? "http://localhost:11434";
    client.BaseAddress = new Uri(ollamaUrl);

    // Sätter timeout till 3 minuter så att tunga inferenser på VPS:en inte kastar fel
    client.Timeout = TimeSpan.FromMinutes(3);
});

// Hämta anslutningssträngen. 
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

    // Kör migreringar (Skapar tabeller om de inte finns)
    dbContext.Database.Migrate();

    // En lista på alla kategorier vi vill ha i systemet
    var desiredCategories = new[]
    {
        "Boende", "El & Värme", "Försäkringar", "Abonnemang",
        "Transport", "Drivmedel", "Bilunderhåll",
        "Livsmedel", "Uteätande", "Systembolaget",
        "Kläder & Skor", "Elektronik", "Nöje", "Husdjur", "Hobby",
        "Hälsa & Apotek", "Träning",
        "Sparande", "Lån & Räntor", "Övrigt", "Mat"
    };

    foreach (var catName in desiredCategories)
    {
        if (!dbContext.Categories.Any(c => c.Name == catName))
        {
            dbContext.Categories.Add(new ExpenseApi.Models.Category { Name = catName });
        }
    }

    dbContext.SaveChanges();
}

// VIKTIG ORDNING: CORS måste ligga före Authorization men efter Routing
app.UseRouting();

// Aktivera CORS
app.UseCors("AllowFrontend");

app.UseAuthorization();

// --- NYTT: Mappa upp healthcheck-endpointen ---
app.MapHealthChecks("/health");

app.MapControllers();

app.Run();