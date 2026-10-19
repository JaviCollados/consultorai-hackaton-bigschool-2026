# ConsultorAI · diagnóstico e impacto para el hackatón

Esta aplicación guarda fichas separadas de empresas y sus procesos. Incluye tres ejemplos ficticios: gestoría, panadería y floristería. Recorre datos, diagnóstico e impacto, y propuesta con presupuesto editable. La lavandería automática quedó como cuarto ejemplo posible y no está precargada.

Demo pública: https://consultorai-bigschool-demo-2026.kamehameja.chatgpt.site/

La demo se presenta como **ConsultorAI**, con rojo intenso, antracita y blanco. El símbolo elegido por Javi está en [la carpeta de activos](assets/consultorai-mark-v1.png); los usos y colores constan en [la guía de marca](docs/brand-guidelines.md).

## Abrir y probar

1. Con Node.js instalado, ejecuta `npm start` desde esta carpeta.
2. Abre `http://localhost:4173` en el navegador.
3. En la gestoría, cambia el volumen de consultas, pulsa **Guardar cambios** y recarga. El nuevo valor debe seguir ahí.
4. Abre la panadería y la floristería. Verifica que sus procesos, indicadores y unidades son distintos de los de la gestoría.
5. Crea una empresa nueva, añade un proceso y guárdala. Cambia de empresa y vuelve para comprobar que conserva los datos.
6. Pulsa **Restaurar gestoría de ejemplo**. Solo se sustituye la ficha de la gestoría.
7. En **Diagnóstico e impacto**, abre un proceso, cambia un criterio y comprueba que cambia la orientación. Selecciona **Tu decisión**, escribe el motivo, guarda y recarga.
8. Cambia adopción, reducción de tiempo y revisión humana. Observa el tiempo mensual y la productividad. La cobertura indica qué parte de los procesos descritos tiene escenario.
9. En la panadería, cambia demanda o capacidad de los pedidos anticipados. Las ventas posibles usan el menor valor. En la gestoría, abre **Servicios de valor añadido** y modifica una acción del resumen de visitas: cambia la suma de tus horas de implantación, sin alterar las horas liberadas al cliente.
10. En **Propuesta y presupuesto**, revisa el precio principal: horas liberadas por los procesos elegidos × coste horario de la empresa × 12 meses × 30 %. Cambia las horas de formación, asistentes o precio por persona y hora, y comprueba el total y el mantenimiento. Añade un servicio de valor y verifica que sus horas y tarifa se suman aparte. Las horas de implantación de los procesos sirven para tu control interno; no se cobran otra vez por hora.
11. Pulsa **Presentar al cliente**. Comprueba que aparecen impacto, intervenciones y precio final, sin costes internos. En esta vista puedes imprimir o guardar como PDF la propuesta preliminar.

Los datos se guardan en el almacenamiento local del navegador. No se sincronizan entre dispositivos y se pierden si se borran los datos del sitio. Usa solo datos ficticios en esta versión. No hay conexión con correo, WhatsApp, sistemas fiscales ni servicios de IA.

Los tres ejemplos iniciales incorporan los datos revisados para la entrega del 19 de octubre. Panadería La Espiga incluye Gestión de turnos y tres intervenciones en la propuesta. Al cargar esta edición, la aplicación guarda una copia de los casos anteriores del mismo navegador antes de actualizar los ejemplos. Los casos adicionales que haya creado el usuario se conservan.

## Qué significan las cifras

Cada proceso guarda volumen, periodo, unidad de trabajo y minutos por unidad. La vista general convierte su tiempo actual a un mes promedio: una semana equivale a 52/12 meses; un trimestre se reparte entre tres meses. El coste de ese tiempo usa la tarifa horaria interna, si se aporta. **No es tiempo ahorrado ni beneficio de IA.** La facturación actual se muestra aparte, como contexto. En la gestoría, las cuotas mensuales se aplican a clientes con cuota (240 fiscales y 200 laborales); 450 gestiones fiscales y 400 laborales quedan anotadas como trabajo incluido y no se multiplican otra vez por la cuota.

En la gestoría revisada, los 30–50 documentos por cliente al mes forman un solo indicador de intervalo editable y son una estimación de contexto. La tarea de recepción tiene 450 **remesas por trimestre**, a ocho minutos por remesa. Su escenario revisado supone 80 % de adopción, 80 % menos tiempo manual en esas remesas y un minuto de revisión por remesa procesada: 10,8 horas mensuales liberadas, aún sin medir en la práctica. Los modelos fiscales son 450 por trimestre, a 15 minutos actuales por modelo. Se supone que el agente comprueba los modelos ya generados por el software fiscal y que un profesional valida cada uno durante cinco minutos: de 37,5 a 12,5 horas al mes, 25 liberadas como hipótesis. Los 200 clientes laborales reciben en conjunto 240 nóminas al mes; el proceso de envío se mide por **cliente destinatario**, a 4,5 minutos por cliente. Su escenario revisado automatiza con reglas la mitad de los envíos, reduce a la mitad el tiempo manual en ellos y añade un minuto de revisión por cliente: 2,1 horas mensuales potencialmente liberadas. Los cuatro procesos suman 332,5 horas mensuales de trabajo actual. El coste horario de 19,07 € usa 2.200 € netos medios por persona, un único incremento supuesto del 30 % y 150 horas efectivas al mes. Es una estimación ficticia y editable; no sale de nóminas reales.

## Evaluación e impacto

La aplicación muestra escenarios de tiempo, productividad y ventas adicionales, junto con servicios de valor añadido propuestos. No son resultados observados. La productividad compara las horas para la misma cesta de trabajo; no se suma como un segundo ahorro a las horas liberadas. Las ventas necesitan demanda, capacidad y precio. Cada servicio de valor añadido describe una capacidad nueva, acciones de implantación y horas propias del consultor. Estas horas no son ahorro del cliente.

La clasificación recomienda automatización con reglas, agente supervisado, asistencia al profesional o ninguna intervención. Los motivos, la conveniencia de una skill y la revisión humana aparecen por separado. El consultor puede cambiar la conclusión y escribir por qué. Esta versión usa criterios locales visibles y **no conecta con un modelo de IA**.

## Propuesta y presupuesto

Los tres casos ficticios incluyen intervenciones iniciales para que la demo muestre propuestas distintas desde el primer momento. El precio principal es una factura única: el 30 % del valor estimado para el cliente durante doce meses. Cada proceso tiene su importe visible en el plan; puede retirarse y recuperarse sin borrar su ficha. La factura y el mantenimiento se recalculan al momento. El valor mensual usa las horas potencialmente liberadas por los procesos elegidos y el coste horario de esa empresa. La productividad es otra forma de describir las mismas horas y no se suma de nuevo. El margen de ventas adicionales solo puede entrar si se estima y se confirma que no repite ese beneficio. La formación se cobra como una sesión general de grupo más las horas individuales por participante, a la tarifa de formación indicada. Los servicios de valor añadido se suman según sus horas, tarifa y costes externos. El mantenimiento mensual es el 30 % anual del importe de implantación de procesos dividido entre doce; formación y añadidos quedan fuera. Todos los porcentajes, horas y precios son supuestos editables. Las horas de implantación de los procesos sirven para comparar internamente la facturación por hora propia; no fijan el precio principal.

El control interno muestra las horas propias previstas y la facturación única dividida entre esas horas. Las horas incluyen implantación de procesos y servicios, tres horas generales de formación como una sesión y las horas individuales multiplicadas por asistentes. No se pide coste horario propio ni se calcula margen. La cuota futura de mantenimiento queda fuera de esta comparación.

La vista de presentación separa lo que se enseña al cliente de los cálculos de trabajo. Los apartados largos de la vista interna se abren al tocarlos para reducir desplazamiento. Los datos permanecen en el navegador; **la vista de cliente es visual y no un control de acceso**. Usa solo datos sintéticos en esta demo.

## Comprobación técnica

`npm test` ejecuta pruebas de unidades, periodos, separación de casos, guardado/restauración, clasificación, escenarios, migración de servicios de valor y presupuesto. La aplicación usa JavaScript del navegador y un servidor local mínimo con Node, sin dependencias externas.
