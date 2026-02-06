using ExpenseApi;
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
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Hämta anslutningssträngen
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

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

// --- DATABASMIGRERINGAR & SEED DATA ---
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ExpenseContext>();

    // Vänta lite på att databasen ska bli redo (viktigt i Docker)
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

// VIKTIG ORDNING: CORS måste ligga före Authorization men efter Routing
app.UseRouting();

// Aktivera CORS
app.UseCors("AllowFrontend");

// Om du kör i Docker kan HTTPS ibland ställa till det om certifikat saknas, 
// men vi behåller den om du har setup för det.
// app.UseHttpsRedirection(); 

app.UseAuthorization();

app.MapControllers();

app.Run();