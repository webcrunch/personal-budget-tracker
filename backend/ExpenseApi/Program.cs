using ExpenseApi; // KORRIGERAD: Använd rätt namnområde för ExpenseContext
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using Swashbuckle.AspNetCore.SwaggerUI;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);


// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        // options.JsonSerializerOptions.DateTimeKind = DateTimeKind.Utc;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Hämta anslutningssträngen från miljövariabler
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// Lägg till DbContext med PostgreSQL
// KORRIGERAD: Använd ExpenseContext istället för AppDbContext
builder.Services.AddDbContext<ExpenseContext>(options =>
    options.UseNpgsql(connectionString));

// --- LÄGG TILL CORS-KONFIGURATION HÄR ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", // Ge din policy ett namn
        policy =>
        {
            policy.WithOrigins("http://localhost:5173") // Tillåt anrop från din React-frontends URL, set to 3000 later
                  .AllowAnyHeader()                     // Tillåt alla headrar
                  .AllowAnyMethod();                    // Tillåt alla HTTP-metoder (GET, POST, PUT, DELETE, etc.)
        });
});
// --- SLUT PÅ CORS-KONFIGURATION ---

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Kör databasmigreringar och lägg till startdata
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ExpenseContext>();
    dbContext.Database.Migrate();

    // Lägg till kategorier om tabellen är tom
    if (!dbContext.Categories.Any())
    {
        dbContext.Categories.AddRange(
            new ExpenseApi.Models.Category { Name = "Mat" },
            new ExpenseApi.Models.Category { Name = "Transport" },
            new ExpenseApi.Models.Category { Name = "Boende" },
            new ExpenseApi.Models.Category { Name = "Nöje" }
        );
        dbContext.SaveChanges();
    }
}

app.UseHttpsRedirection();

// --- ANVÄND CORS-POLICYN HÄR ---
app.UseCors("AllowFrontend");

app.UseAuthorization();

// Kör databasmigreringar vid uppstart
using (var scope = app.Services.CreateScope())
{
    // KORRIGERAD: Använd ExpenseContext istället för AppDbContext
    var dbContext = scope.ServiceProvider.GetRequiredService<ExpenseContext>();
    dbContext.Database.Migrate();
}

app.MapControllers();

app.Run();
