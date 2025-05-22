using Microsoft.EntityFrameworkCore; // Lägg till denna using-sats
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using ExpenseApi; // Make sure the namespace matches your project's namespace
using Microsoft.OpenApi.Models; // För Swagger/OpenAPI
using Swashbuckle.AspNetCore.SwaggerGen; // Explicit using för SwaggerGen
using Swashbuckle.AspNetCore.SwaggerUI; // Explicit using för SwaggerUI

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
// Installera Swashbuckle
builder.Services.AddSwaggerGen(); // Denna metod kommer från Swashbuckle.AspNetCore

// Add database context
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ExpenseContext>(options =>
    options.UseNpgsql(connectionString));

var app = builder.Build();

// Apply database migrations on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ExpenseContext>();
    // Ensure the database is created and migrations are applied
    dbContext.Database.Migrate();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger(); // Denna metod kommer från Swashbuckle.AspNetCore
    app.UseSwaggerUI(); // Denna metod kommer från Swashbuckle.AspNetCore
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();