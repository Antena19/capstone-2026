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
        public PuntoGeoJson Origen { get; set; } = new();

        [BsonElement("destino")]
        public PuntoGeoJson Destino { get; set; } = new();

        /// <summary>
        /// El documento de referencia solo define un arreglo, posiblemente vacío.
        /// Cada elemento se persiste como GeoJSON Point, sin campos adicionales.
        /// </summary>
        [BsonElement("puntosRecogida")]
        public List<PuntoGeoJson> PuntosRecogida { get; set; } = new();

        [BsonElement("trazado")]
        public LineaGeoJson Trazado { get; set; } = new();

        [BsonElement("distanciaEstimadaKm")]
        public double DistanciaEstimadaKm { get; set; }

        [BsonElement("duracionEstimadaMin")]
        public int DuracionEstimadaMin { get; set; }

        [BsonElement("estado")]
        [BsonRepresentation(BsonType.String)]
        public EstadoRegistro Estado { get; set; } = EstadoRegistro.ACTIVO;
    }
}
