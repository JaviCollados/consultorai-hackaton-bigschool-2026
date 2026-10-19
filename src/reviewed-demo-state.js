// Copia de las fichas ficticias revisadas para la entrega.
export const REVIEWED_DEMO_REVISION = '2026-10-19-reviewed';
export const reviewedDemoState = {
  "version": 1,
  "activeId": "3a7a9b3a-a800-4e8f-abd2-e07a30780a73",
  "cases": [
    {
      "id": "3a7a9b3a-a800-4e8f-abd2-e07a30780a73",
      "name": "Gestoría Aurora",
      "sector": "Gestoría",
      "sample": true,
      "sampleKey": "gestoria",
      "description": "Caso ficticio con seis personas en fiscal y dos en laboral. Las cifras son estimaciones para la demo.",
      "staffCount": 8,
      "workingDaysPerWeek": 5,
      "hourlyCost": 19.07,
      "hourlyCostNote": "Estimación para esta gestoría ficticia: 8 personas × 2.200 € netos medios al mes. Se añade un único 30 % para aproximar el coste total de empresa: 2.860 € por persona y mes, 22.880 € para el equipo. Se estiman 150 horas efectivas al mes por persona (aprox. 225 jornadas de 8 horas al año, descontando vacaciones y festivos): 1.200 horas del equipo al mes. 22.880 € ÷ 1.200 h = 19,07 €/h. Supuestos de demo, editables; no son datos de nóminas reales.",
      "metrics": [
        {
          "id": "d1ada079-8c4e-4281-b719-1e52503f65a7",
          "label": "Clientes fiscales",
          "value": 240,
          "unit": "clientes",
          "period": "mes",
          "note": "Tamaño supuesto de la cartera para la demo."
        },
        {
          "id": "09b7b666-baea-45ac-9ad2-127a70a9583a",
          "label": "Clientes laborales",
          "value": 200,
          "unit": "clientes",
          "period": "mes",
          "note": "Supuesto ficticio para la demo."
        },
        {
          "id": "b99c21ec-3f80-4c62-a5cb-da80e649e1cb",
          "label": "Nóminas emitidas",
          "value": 240,
          "unit": "nóminas",
          "period": "mes",
          "note": "200 clientes laborales y 240 nóminas al mes en total; algunos clientes tienen más de un empleado. El proceso de envío cuenta clientes destinatarios, no nóminas."
        },
        {
          "id": "a6382515-9ad7-42ed-980f-5ed2d87f3979",
          "label": "Documentos por cliente",
          "value": null,
          "unit": "documentos por cliente",
          "period": "mes",
          "note": "Estimación de documentos recibidos o gestionados por cliente y mes, no solo facturas. La recepción principal se agrupa por trimestre.",
          "kind": "range",
          "minValue": 30,
          "maxValue": 50
        }
      ],
      "revenueStreams": [
        {
          "id": "05d67110-5ee6-4062-9b2e-a9d67a0de389",
          "label": "Cuota fiscal mensual",
          "quantity": 240,
          "billingUnit": "clientes con cuota",
          "unitPrice": 275,
          "includedServices": "450 gestiones fiscales al mes",
          "grossMarginPct": null,
          "period": "mes",
          "note": "Cuota ficticia por cliente y mes que incluye varias gestiones. Solo contexto; no interviene en los cálculos de impacto."
        },
        {
          "id": "8f841dca-597a-43ae-baf4-7d1892bb726b",
          "label": "Cuota laboral mensual",
          "quantity": 200,
          "billingUnit": "clientes con cuota",
          "unitPrice": 200,
          "includedServices": "400 gestiones laborales al mes",
          "grossMarginPct": null,
          "period": "mes",
          "note": "Cuota ficticia por cliente y mes que incluye varias gestiones. Solo contexto; no interviene en los cálculos de impacto."
        }
      ],
      "processes": [
        {
          "id": "7dc836ed-ded3-4027-b1c3-c145bbfb135a",
          "name": "Consultas de clientes",
          "description": "Respuestas a consultas por correo o WhatsApp.",
          "volume": 600,
          "period": "semana",
          "unit": "consultas",
          "minutes": 6,
          "currentTools": "Correo y WhatsApp",
          "notes": "Volumen ajustado durante la revisión del caso ficticio.",
          "assessment": {
            "repetition": "alta",
            "rules": "parciales",
            "context": "si",
            "existingAutomation": "no",
            "risk": "medio",
            "reusable": "si"
          },
          "scenario": {
            "adoptionPct": 50,
            "timeReductionPct": 50,
            "reviewMinutes": 1
          }
        },
        {
          "id": "22734847-d470-4b4b-8723-9c0faec7d79b",
          "name": "Recepción y archivo de documentos",
          "description": "Recibir y guardar cada remesa enviada por un cliente.",
          "volume": 450,
          "period": "trimestre",
          "unit": "remesas de clientes",
          "minutes": 8,
          "currentTools": "Correo y carpetas",
          "notes": "450 remesas por trimestre en el caso revisado. Cada cliente genera 30–50 documentos al mes; ocho minutos por remesa completa, no por documento.",
          "documentScenarioRevision": 2,
          "assessment": {
            "repetition": "alta",
            "rules": "claras",
            "context": "no",
            "existingAutomation": "no",
            "risk": "medio",
            "reusable": "no"
          },
          "scenario": {
            "adoptionPct": 80,
            "timeReductionPct": 80,
            "reviewMinutes": 1
          }
        },
        {
          "id": "db9029dd-d9b7-4fba-8f96-3f1052ab2988",
          "name": "Preparación de modelos fiscales",
          "description": "Preparación y revisión de modelos fiscales.",
          "volume": 450,
          "period": "trimestre",
          "unit": "modelos",
          "minutes": 15,
          "currentTools": "Software fiscal existente",
          "notes": "450 modelos por trimestre en el caso revisado. Algunos modelos anuales quedan sin cuantificar. El software fiscal ya genera el modelo; se plantea que un agente lo compruebe y prepare incidencias para que un profesional dedique cinco minutos a validarlo antes de presentarlo. Escenario sin medir.",
          "consultantDecision": "agente",
          "decisionReason": "El software fiscal ya genera el modelo. Un agente con supervisión comprueba el resultado y prepara incidencias; un profesional valida y presenta cada modelo. La reducción de tiempo es una hipótesis pendiente de medir.",
          "fiscalModelsScenarioRevision": 2,
          "assessment": {
            "repetition": "alta",
            "rules": "parciales",
            "context": "si",
            "existingAutomation": "si",
            "risk": "alto",
            "reusable": "si"
          },
          "scenario": {
            "adoptionPct": 100,
            "timeReductionPct": 100,
            "reviewMinutes": 5
          }
        },
        {
          "id": "488cd06f-d50f-4c70-8774-4e8b1330232a",
          "name": "Envío de nóminas",
          "description": "Envío mensual de las nóminas a cada cliente laboral.",
          "volume": 200,
          "period": "mes",
          "unit": "clientes destinatarios",
          "minutes": 4.5,
          "currentTools": "Software laboral existente",
          "notes": "200 clientes laborales reciben en conjunto 240 nóminas al mes. El envío se mide por cliente destinatario: 200 envíos × 4,5 minutos por cliente = 15 horas mensuales. Un cliente puede recibir varias nóminas en un mismo envío. La preparación ya está automatizada en parte.",
          "consultantDecision": "automatizacion",
          "decisionReason": "Las reglas de envío y las incidencias de bonus, horas extra o productividad pueden configurarse por cliente según sus indicaciones. Se comprueba cada resultado antes de enviarlo; el riesgo de datos laborales exige control humano. Hipótesis pendiente de medir.",
          "payrollScenarioRevision": 2,
          "assessment": {
            "repetition": "alta",
            "rules": "claras",
            "context": "no",
            "existingAutomation": "si",
            "risk": "alto",
            "reusable": "si"
          },
          "scenario": {
            "adoptionPct": 50,
            "timeReductionPct": 50,
            "reviewMinutes": 1
          }
        }
      ],
      "payrollCountsRevision": 2,
      "valueOpportunity": {
        "name": "Resumen de visita con acuerdos e hitos",
        "processId": "",
        "eligibleUnits": 20,
        "period": "mes",
        "baselineCoveragePct": 10,
        "targetCoveragePct": 80,
        "evidence": "Hipótesis: revisar resúmenes entregados y valoración del cliente.",
        "valuePerImprovedUnit": null,
        "valueSource": ""
      },
      "evaluationExamplesAdded": true,
      "valueServices": [
        {
          "id": "d257871c-ec62-4ad2-909c-fbe4e3efdb44",
          "name": "Resumen de visita con acuerdos e hitos",
          "outcome": "Mejorar la información que recibe el cliente y el seguimiento de los acuerdos.",
          "evidence": "Hipótesis: revisar resúmenes entregados y valoración del cliente.",
          "legacyNote": "Estimación anterior: 20 unidades por mes; cobertura 10 % → 80 %. Se conserva como contexto, sin usarla para presupuestar.",
          "actions": [
            {
              "id": "1adea0f0-5841-4e0c-bcb6-a74697c861d7",
              "title": "Definir plantilla de acuerdos, hitos y responsables",
              "hours": 4
            },
            {
              "id": "22452a05-e2ea-49e9-a6ad-cada09f209d5",
              "title": "Configurar el flujo de generación y revisión",
              "hours": 8
            },
            {
              "id": "8452ff48-8abf-42ad-b421-b87959acfac3",
              "title": "Probar el servicio y explicar su uso al equipo",
              "hours": 4
            }
          ]
        }
      ],
      "proposal": {
        "title": "Propuesta de implantación para Gestoría Aurora",
        "summary": "Intervenciones iniciales para mejorar los procesos descritos de Gestoría Aurora. Alcance y resultados sujetos a validación.",
        "notes": "Presupuesto de demostración con importes editables. Confirmar alcance, pruebas, costes externos e impuestos antes de presentar una oferta real.",
        "consultantCostPerHour": null,
        "pricing": {
          "capturePct": 30,
          "benefitMonths": 12,
          "includeSalesMargin": false,
          "salesNonOverlapConfirmed": false,
          "trainingGeneralHours": 3,
          "trainingIndividualHoursPerPerson": 2,
          "trainingParticipants": 8,
          "trainingRatePerPersonHour": 40,
          "maintenancePct": 30
        },
        "lines": [
          {
            "id": "87faa8a5-8bc8-4621-8a76-fcd2b8c84a26",
            "processId": "7dc836ed-ded3-4027-b1c3-c145bbfb135a",
            "category": "agente",
            "title": "Consultas de clientes: agente supervisado",
            "detail": "Diseñar instrucciones, conectar el flujo de trabajo y validar con supervisión",
            "hours": 33,
            "hourlyRate": 75,
            "externalCost": 0,
            "monthlySupport": 0
          },
          {
            "id": "b5482b0a-9720-4732-8f16-dbfeec2d3176",
            "processId": "22734847-d470-4b4b-8723-9c0faec7d79b",
            "category": "automatizacion",
            "title": "Recepción y archivo de documentos: automatización",
            "detail": "Configurar el flujo, probar excepciones y documentar su uso",
            "hours": 19,
            "hourlyRate": 75,
            "externalCost": 0,
            "monthlySupport": 0
          },
          {
            "id": "fe765434-0a86-4ade-a526-f231c4af9232",
            "processId": "db9029dd-d9b7-4fba-8f96-3f1052ab2988",
            "category": "agente",
            "title": "Preparación de modelos fiscales: agente supervisado",
            "detail": "Diseñar instrucciones, conectar el flujo de trabajo y validar con supervisión",
            "hours": 31,
            "hourlyRate": 75,
            "externalCost": 0,
            "monthlySupport": 0
          },
          {
            "id": "da63b7c8-3481-4cbf-ab79-a3993deb4d05",
            "processId": "488cd06f-d50f-4c70-8774-4e8b1330232a",
            "category": "automatizacion",
            "title": "Envío de nóminas: automatización",
            "detail": "Configurar el flujo, probar excepciones y documentar su uso",
            "hours": 19,
            "hourlyRate": 75,
            "externalCost": 0,
            "monthlySupport": 0
          }
        ]
      }
    },
    {
      "id": "297dd5a3-0527-4206-a7cc-599d9b575423",
      "name": "Panadería La Espiga",
      "sector": "Panadería",
      "sample": true,
      "sampleKey": "panaderia",
      "description": "Ejemplo sintético para comprobar que los procesos y las unidades cambian de sector. Revisar todas las cifras antes de una consultoría real.",
      "staffCount": 4,
      "workingDaysPerWeek": 6,
      "hourlyCost": 13.87,
      "hourlyCostNote": "Supuesto ficticio de Panadería La Espiga: 4 personas con 1.600 € netos medios por persona y mes. Se aplica un único 30 % para aproximar el coste total de empresa: 2.080 € por persona y 8.320 € para el equipo al mes. Se estiman 150 horas efectivas mensuales por persona; la apertura seis días se cubre con turnos y no implica seis jornadas semanales por empleado. 8.320 € ÷ (4 × 150 h) = 13,87 €/h. Estimación editable de demo, no dato laboral real.",
      "metrics": [
        {
          "id": "20f37271-e28c-49a2-b252-f4c3fc42328d",
          "label": "Pedidos recibidos",
          "value": 25,
          "unit": "pedidos",
          "period": "dia_laborable",
          "note": "Supuesto de demostración."
        },
        {
          "id": "691fecca-f465-4eac-af06-5d39e00d7e4b",
          "label": "Productos habituales",
          "value": 18,
          "unit": "referencias",
          "period": "mes",
          "note": "Supuesto de demostración."
        }
      ],
      "revenueStreams": [],
      "processes": [
        {
          "id": "f7fe7712-19d3-446b-804d-fa99e9d27313",
          "name": "Atención de pedidos",
          "description": "Registrar pedidos por teléfono o mostrador y confirmar recogida.",
          "volume": 25,
          "period": "dia_laborable",
          "unit": "pedidos",
          "minutes": 3,
          "currentTools": "Teléfono y cuaderno",
          "notes": "Volumen y tiempo supuestos para la demo.",
          "assessment": {
            "repetition": "alta",
            "rules": "claras",
            "context": "no",
            "existingAutomation": "no",
            "risk": "bajo",
            "reusable": "no"
          },
          "scenario": {
            "adoptionPct": 90,
            "timeReductionPct": 50,
            "reviewMinutes": 0.5
          },
          "consultantDecision": "agente",
          "decisionReason": "Creo que es posible automatizar pedidos con agente"
        },
        {
          "id": "0a7ab690-8d5b-4023-8468-f3c7336b39dc",
          "name": "Planificación de producción",
          "description": "Organizar cantidades para la jornada siguiente.",
          "volume": 1,
          "period": "dia_laborable",
          "unit": "planes diarios",
          "minutes": 25,
          "currentTools": "Hoja de cálculo",
          "notes": "Tiempo supuesto para la demo.",
          "assessment": {
            "repetition": "alta",
            "rules": "parciales",
            "context": "si",
            "existingAutomation": "si",
            "risk": "medio",
            "reusable": "si"
          },
          "scenario": {
            "adoptionPct": 90,
            "timeReductionPct": 50,
            "reviewMinutes": 2
          },
          "consultantDecision": "agente",
          "decisionReason": "Automatizar la planificación en función de los pedidos."
        },
        {
          "id": "b00cc989-97d7-4155-88bd-fb5eddeb710a",
          "name": "Gestion de turnos",
          "description": "Organiza los turnos de horno y tienda. ",
          "volume": 2,
          "period": "dia_laborable",
          "unit": "plan diario",
          "minutes": 15,
          "currentTools": "Excel",
          "notes": "",
          "assessment": {
            "repetition": "alta",
            "rules": "claras",
            "context": "no"
          },
          "decisionReason": "Automatización con los turnos similares, solo cambian las personas y se valoran los pedidos yy la producción para tener en cuenta los turnos.",
          "consultantDecision": "agente",
          "scenario": {
            "adoptionPct": 90,
            "timeReductionPct": 50,
            "reviewMinutes": 2
          }
        }
      ],
      "salesOpportunity": {
        "name": "Pedidos anticipados",
        "processId": "f7fe7712-19d3-446b-804d-fa99e9d27313",
        "unit": "pedidos",
        "demand": 100,
        "capacity": 60,
        "unitPrice": 8,
        "period": "mes",
        "grossMarginPct": null,
        "overlapNote": "Ejemplo ficticio; validar demanda y capacidad."
      },
      "evaluationExamplesAdded": true,
      "valueServices": [],
      "proposal": {
        "title": "Propuesta de implantación para Panadería La Espiga",
        "summary": "Intervenciones iniciales para mejorar los procesos descritos de Panadería La Espiga. Alcance y resultados sujetos a validación.",
        "notes": "Presupuesto de demostración con importes editables. Confirmar alcance, pruebas, costes externos e impuestos antes de presentar una oferta real.",
        "consultantCostPerHour": null,
        "pricing": {
          "capturePct": 30,
          "benefitMonths": 12,
          "includeSalesMargin": false,
          "salesNonOverlapConfirmed": false,
          "trainingGeneralHours": 1,
          "trainingIndividualHoursPerPerson": 2,
          "trainingParticipants": 4,
          "trainingRatePerPersonHour": 40,
          "maintenancePct": 30
        },
        "lines": [
          {
            "id": "424c6656-8e42-440d-9eeb-94d55a5ff110",
            "processId": "f7fe7712-19d3-446b-804d-fa99e9d27313",
            "category": "agente",
            "title": "Atención de pedidos: agente supervisado",
            "detail": "Diseñar instrucciones, conectar el flujo de trabajo y validar con supervisión",
            "hours": 32,
            "hourlyRate": 75,
            "externalCost": 0,
            "monthlySupport": 0
          },
          {
            "id": "452ed77e-c0f3-4d38-8df9-a151584b69db",
            "processId": "0a7ab690-8d5b-4023-8468-f3c7336b39dc",
            "category": "agente",
            "title": "Planificación de producción: agente supervisado",
            "detail": "Diseñar instrucciones, conectar el flujo de trabajo y validar con supervisión",
            "hours": 29,
            "hourlyRate": 75,
            "externalCost": 0,
            "monthlySupport": 0
          },
          {
            "id": "52b90534-0344-4164-a36d-736b1d1900e9",
            "processId": "b00cc989-97d7-4155-88bd-fb5eddeb710a",
            "category": "agente",
            "title": "Gestion de turnos: agente supervisado",
            "detail": "Diseñar instrucciones, conectar el flujo de trabajo y validar con supervisión",
            "hours": 30,
            "hourlyRate": 75,
            "externalCost": 0,
            "monthlySupport": 0
          }
        ]
      }
    },
    {
      "id": "2cd9f1b8-e0b3-41f7-9358-b48bd7d41dcc",
      "name": "Floristería Azahar",
      "sector": "Floristería",
      "sample": true,
      "sampleKey": "floristeria",
      "description": "Ejemplo sintético de negocio con encargos y eventos. Volúmenes editables; no representan un negocio real.",
      "staffCount": 3,
      "workingDaysPerWeek": 6,
      "hourlyCost": 13,
      "hourlyCostNote": "Supuesto ficticio de Floristería Azahar: 3 personas con 1.500 € netos medios por persona y mes. Se aplica un único 30 % para aproximar el coste total de empresa: 1.950 € por persona y 5.850 € para el equipo al mes. Se estiman 150 horas efectivas mensuales por persona; la apertura seis días se cubre con turnos. 5.850 € ÷ (3 × 150 h) = 13,00 €/h. Estimación editable de demo, no dato laboral real.",
      "metrics": [
        {
          "id": "64cee2ca-26c9-4018-998c-9a780d792b3d",
          "label": "Encargos",
          "value": 12,
          "unit": "encargos",
          "period": "dia_laborable",
          "note": "Supuesto de demostración."
        },
        {
          "id": "a005a7d3-d678-4e61-b7eb-c8d2e1b41c1a",
          "label": "Eventos",
          "value": 4,
          "unit": "eventos",
          "period": "mes",
          "note": "Supuesto de demostración."
        }
      ],
      "revenueStreams": [],
      "processes": [
        {
          "id": "841dbf7d-975e-4db1-bb26-76631e61ae37",
          "name": "Preparación de encargos",
          "description": "Registrar preferencias y preparar cada pedido floral.",
          "volume": 20,
          "period": "dia_laborable",
          "unit": "encargos",
          "minutes": 10,
          "currentTools": "Teléfono y agenda",
          "notes": "Tiempo supuesto: incluye coordinación, no solo trabajo manual.",
          "assessment": {
            "repetition": "alta",
            "rules": "parciales",
            "context": "si",
            "existingAutomation": "no",
            "risk": "bajo",
            "reusable": "si"
          },
          "scenario": {
            "adoptionPct": 50,
            "timeReductionPct": 50,
            "reviewMinutes": 1
          },
          "consultantDecision": "agente",
          "decisionReason": "Necesita un agente más complejo para tomar decisiones acotadas a cada encargo."
        },
        {
          "id": "59339a26-70bd-4887-8901-a9889a5d95be",
          "name": "Atención de eventos",
          "description": "Recoger requisitos, fechas y cambios de cada evento.",
          "volume": 12,
          "period": "mes",
          "unit": "eventos",
          "minutes": 35,
          "currentTools": "Correo y agenda",
          "notes": "Solo tiempo administrativo supuesto; no incluye montaje.",
          "assessment": {
            "repetition": "media",
            "rules": "variables",
            "context": "si",
            "existingAutomation": "no",
            "risk": "medio",
            "reusable": "si"
          },
          "scenario": {
            "adoptionPct": 50,
            "timeReductionPct": 50,
            "reviewMinutes": 3
          },
          "consultantDecision": "agente",
          "decisionReason": "Necesita un agente más complejo para tomar decisiones acotadas a cada encargo."
        }
      ],
      "salesOpportunity": {
        "name": "Eventos adicionales",
        "processId": "59339a26-70bd-4887-8901-a9889a5d95be",
        "unit": "eventos",
        "demand": 4,
        "capacity": 2,
        "unitPrice": 180,
        "period": "mes",
        "grossMarginPct": null,
        "overlapNote": "Ejemplo ficticio; validar demanda y capacidad."
      },
      "evaluationExamplesAdded": true,
      "valueServices": [],
      "proposal": {
        "title": "Propuesta de implantación para Floristería Azahar",
        "summary": "Intervenciones iniciales para mejorar los procesos descritos de Floristería Azahar. Alcance y resultados sujetos a validación.",
        "notes": "Presupuesto de demostración con importes editables. Confirmar alcance, pruebas, costes externos e impuestos antes de presentar una oferta real.",
        "consultantCostPerHour": null,
        "pricing": {
          "capturePct": 30,
          "benefitMonths": 12,
          "includeSalesMargin": false,
          "salesNonOverlapConfirmed": false,
          "trainingGeneralHours": 1,
          "trainingIndividualHoursPerPerson": 1,
          "trainingParticipants": 3,
          "trainingRatePerPersonHour": 40,
          "maintenancePct": 30
        },
        "lines": [
          {
            "id": "15a604cd-2cbd-4327-962f-f02eb69dd5a7",
            "processId": "841dbf7d-975e-4db1-bb26-76631e61ae37",
            "category": "agente",
            "title": "Preparación de encargos: agente supervisado",
            "detail": "Diseñar instrucciones, conectar el flujo de trabajo y validar con supervisión",
            "hours": 31,
            "hourlyRate": 75,
            "externalCost": 0,
            "monthlySupport": 0
          },
          {
            "id": "89b4a085-5e6c-4645-8c7b-78973b2b4394",
            "processId": "59339a26-70bd-4887-8901-a9889a5d95be",
            "category": "agente",
            "title": "Atención de eventos: agente supervisado",
            "detail": "Diseñar instrucciones, conectar el flujo de trabajo y validar con supervisión",
            "hours": 28,
            "hourlyRate": 75,
            "externalCost": 0,
            "monthlySupport": 0
          }
        ]
      }
    }
  ],
  "demoSeedRevision": "2026-10-19-reviewed"
};
