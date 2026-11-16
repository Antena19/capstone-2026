using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Documento de la colección MongoDB <c>rutas</c>.
    /// No se expone en las respuestas de la API: se utilizan DTOs.
    /// <c>empresaId</c> referencia conceptualmente a <c>empresa_cliente.id_empresa</c> en MySQL.
    /// </summary>
    [BsonIgnoreExtraElements]
    public class Ruta
    {
        [BsonId]
        public ObjectId Id { get; set; }

        [BsonElement("nombre")]
        public string Nombre { get; set; } = string.Empty;

        [BsonElement("empresaId")]
        public int EmpresaId { get; set; }

        [BsonElement("sector")]
        public string Sector { get; set; } = string.Empty;

        [BsonElement("origen")]
        [BsonIgnoreIfNull]
        public PuntoGeoJson? Origen { get; set; }

        [BsonElement("nombreOrigen")]
        [BsonIgnoreIfNull]
        public string? NombreOrigen { get; set; }

        [BsonElement("referenciaOrigen")]
        [BsonIgnoreIfNull]
        public string? ReferenciaOrigen { get; set; }

        [BsonElement("destino")]
        [BsonIgnoreIfNull]
        public PuntoGeoJson? Destino { get; set; }

        [BsonElement("nombreDestino")]
        [BsonIgnoreIfNull]
        public string? NombreDestino { get; set; }

        [BsonElement("referenciaDestino")]
        [BsonIgnoreIfNull]
        public string? ReferenciaDestino { get; set; }

        /// <summary>
        /// Puntos de recogida embebidos. Puede ser un arreglo vacío.
        /// Cada elemento tiene identificador estable, nombre, orden y ubicación GeoJSON.
        /// </summary>
        [BsonElement("puntosRecogida")]
        public List<PuntoRecogidaRuta> PuntosRecogida { get; set; } = new();

        [BsonElement("trazado")]
        [BsonIgnoreIfNull]
        public LineaGeoJson? Trazado { get; set; }

        [BsonElement("distanciaEstimadaKm")]
        public double DistanciaEstimadaKm { get; set; }

        [BsonElement("duracionEstimadaMin")]
        public int DuracionEstimadaMin { get; set; }

        [BsonElement("estado")]
        [BsonRepresentation(BsonType.String)]
        public EstadoRegistro Estado { get; set; } = EstadoRegistro.ACTIVO;
    }
}
