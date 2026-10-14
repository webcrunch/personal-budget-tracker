using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExpenseApi.Migrations
{
    /// <inheritdoc />
    public partial class AddFixedAndPendingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPending",
                table: "Expenses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "CategoryId",
                table: "ExpenseItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsFixed",
                table: "Categories",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseItems_CategoryId",
                table: "ExpenseItems",
                column: "CategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_ExpenseItems_Categories_CategoryId",
                table: "ExpenseItems",
                column: "CategoryId",
                principalTable: "Categories",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExpenseItems_Categories_CategoryId",
                table: "ExpenseItems");

            migrationBuilder.DropIndex(
                name: "IX_ExpenseItems_CategoryId",
                table: "ExpenseItems");

            migrationBuilder.DropColumn(
                name: "IsPending",
                table: "Expenses");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "ExpenseItems");

            migrationBuilder.DropColumn(
                name: "IsFixed",
                table: "Categories");
        }
    }
}
