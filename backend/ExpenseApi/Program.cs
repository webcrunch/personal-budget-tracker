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

// Registrera AiService så att Controllern kan använda den
builder.Services.AddHttpClient<AiService>();

// Hämta anslutningssträngen. 
// GetValue kollar först efter miljövariabeln CONNECTION_STRING (som vi har i docker-compose.yml), 
// fallback till GetConnectionString för lokalt bruk.
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
        "Sparande", "Lån & Räntor", "Övrigt", "Mat" // "Mat" är kvar ifall du har gamla utgifter kopplade till den
    };

    // Kontrollera varje kategori i listan. Om den INTE finns i databasen, lägg till den!
    // På detta sätt slipper vi dubbletter och ser till att du får hela listan.
    foreach (var catName in desiredCategories)
    {
        if (!dbContext.Categories.Any(c => c.Name == catName))
        {
            dbContext.Categories.Add(new ExpenseApi.Models.Category { Name = catName });
        }
    }

    // Spara alla nyligen tillagda kategorier till databasen
    dbContext.SaveChanges();
}

// VIKTIG ORDNING: CORS måste ligga före Authorization men efter Routing
app.UseRouting();

// Aktivera CORS
app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

app.Run();