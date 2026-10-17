namespace BACKEND.Negocio.Constantes
{
    /// <summary>
    /// Claves de <c>configuracion_sistema</c>.
    /// </summary>
    public static class ClavesConfiguracion
    {
        /// <summary>
        /// Último id_servicio existente al activar la cancelación automática.
        /// Solo se cancelan servicios con id estrictamente mayor.
        /// </summary>
        public const string CorteCancelacionAutomatica = "cancelacion_automatica.id_servicio_corte";
    }
}
