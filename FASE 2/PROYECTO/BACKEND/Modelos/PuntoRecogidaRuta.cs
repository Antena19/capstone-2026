using MongoDB.Bson.Serialization.Attributes;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Punto de recogida embebido en el documento Ruta de MongoDB.
    /// <c>idPunto</c> es estable dentro de la ruta (por ejemplo PR-001) y no depende del índice del arreglo.
    /// </summary>
    [BsonIgnoreExtraElements]
    public class PuntoRecogidaRuta
    {
        [BsonElement("idPunto")]
        public string IdPunto { get; set; } = string.Empty;

        [BsonElement("nombre")]
        public string Nombre { get; set; } = string.Empty;

        [BsonElement("referencia")]
        public string? Referencia { get; set; }

        [BsonElement("orden")]
        public int Orden { get; set; }

        [BsonElement("ubicacion")]
        public PuntoGeoJson Ubicacion { get; set; } = new();
    }
}
