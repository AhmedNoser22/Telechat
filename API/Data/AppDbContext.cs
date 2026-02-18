namespace API.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {

    }
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<Block>()
        .HasOne(b => b.Blocker)
        .WithMany(u => u.BlockedUsers)
        .HasForeignKey(b => b.BlockerId)
        .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Block>()
            .HasOne(b => b.Blocked)
            .WithMany(u => u.BlockedBy)
            .HasForeignKey(b => b.BlockedId)
            .OnDelete(DeleteBehavior.Restrict);
    }
    public DbSet<Message> Messages { get; set; }
    public DbSet<Block> Blocks { get; set; }
}
