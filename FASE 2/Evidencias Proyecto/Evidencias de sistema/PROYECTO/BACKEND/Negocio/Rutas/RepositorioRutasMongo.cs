using BACKEND.Modelos;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BACKEND.Negocio.Rutas
{
    /// <summary>
    /// Lectura de rutas por identificador. Las pruebas sustituyen la implementación
    /// para no depender de MongoDB al validar la programación.
    /// </summary>
    public interface IRepositorioRutas
    {
        Task<Ruta?> ObtenerPorIdAsync(ObjectId id);
    }

    public sealed class RepositorioRutasMongo : IRepositorioRutas
    {
        private readonly IMongoCollection<Ruta> _rutas;

        public RepositorioRutasMongo(IMongoCollection<Ruta> rutas)
        {
            _rutas = rutas;
        }

        public async Task<Ruta?> ObtenerPorIdAsync(ObjectId id)
        {
            return await _rutas.Find(r => r.Id == id).FirstOrDefaultAsync();
        }
    }
}
