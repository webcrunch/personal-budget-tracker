using Microsoft.EntityFrameworkCore; // Lägg till denna using-sats
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using ExpenseApi; // Se till att namnområdet matchar ditt projekts namnområde
using Microsoft.OpenApi.Models; // För Swagger/OpenAPI
using Swashbuckle.AspNetCore.SwaggerGen; // Explicit using för SwaggerGen
using Swashbuckle.AspNetCore.SwaggerUI; // Explicit using för SwaggerUI
using System.Text.Json.Serialization; // Lägg till denna using-sats för JsonOptions

var builder = WebApplication.CreateBuilder(args);

// Lägg till tjänster till containern.
builder.Services.AddControllers()
    .AddJsonOptions(options => // KORRIGERAD: Använd AddJsonOptions här
    {
        // Konfigurera JSON-hantering för DateTime
        // Detta säkerställer att inkommande datumsträngar (t.ex. "2024-01-20") tolkas som UTC.
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.Preserve;
        // Removed invalid DateTimeKind property. If you want to ensure UTC, handle it in your model or with a custom converter.
    });
// Lär dig mer om att konfigurera Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
// Installera Swashbuckle
builder.Services.AddSwaggerGen(); // Denna metod kommer från Swashbuckle.AspNetCore

// Lägg till databaskontext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ExpenseContext>(options =>
    options.UseNpgsql(connectionString));

var app = builder.Build();

// Tillämpa databasmigreringar vid uppstart
// Detta säkerställer att databasens schema är uppdaterat när applikationen startar.
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ExpenseContext>();
    // Se till att databasen skapas och migreringar tillämpas
    dbContext.Database.Migrate();
}

// Konfigurera HTTP-förfrågningspipelinen.
// Swagger UI aktiveras endast i utvecklingsmiljö.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger(); // Denna metod kommer från Swashbuckle.AspNetCore
    app.UseSwaggerUI(); // Denna metod kommer från Swashbuckle.AspNetCore
}

app.UseHttpsRedirection(); // Omdirigerar HTTP-förfrågningar till HTTPS
app.UseAuthorization(); // Aktiverar auktoriseringsmiddleware
app.MapControllers(); // Mappar controller-vägar
app.Run(); // Startar applikationen
