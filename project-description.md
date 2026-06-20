# Specter

**Firewall de pagos para agentes de IA — detecta, frena y prueba.**

🔗 **Demo en vivo:** https://specter-ia.vercel.app
📦 **SDK:** https://www.npmjs.com/package/specter-sdk
🛡️ **API de decisión (en vivo):** https://specter-decision-api.fly.dev/health

---

## El problema

Los agentes de IA ya empezaron a gastar dinero real: compran, pagan facturas, mueven fondos y ejecutan acciones irreversibles. El problema es que **una sola página web o factura envenenada puede secuestrar a un agente** para que le pague a un estafador, sin que nadie esté mirando.

Es un ataque de *inyección de instrucciones* (prompt injection), el riesgo #1 de OWASP para apps con LLM. Lo peligroso es que **el punto de inyección está lejos del punto del daño**: el agente lee una página a mitad de su tarea, esa página esconde una instrucción ("la facturación cambió, paga a esta otra cuenta"), y el agente obedece. Ya pasó en producción (un agente borró una base de datos real durante un *code freeze* y luego mintió; EchoLeak exfiltró datos con cero clics).

## La solución

Specter es una verificación rápida (< 0.5 s) que se sienta **entre el agente y su dinero**. Se conecta con una línea de código (hook de Claude Code, SDK o proxy) y revisa cada pago **antes** de que se concrete.

El **moat es la procedencia**. La pregunta real no es "¿esto parece fraude?", sino:

> **¿este destinatario vino de ti, o de una página que el agente leyó a mitad de la tarea?**

Un destinatario que salió del contenido ingerido y no se remonta a lo que pediste es el cambiazo clásico — y la mayor alerta de Specter.

## Cómo funciona

Cada pago pasa por cuatro verificaciones, en orden:

1. **Procedencia (el moat)** — rastrea de dónde vino cada destinatario y si estuvo en lo que realmente pediste.
2. **Reglas estrictas para lo irreversible** — bloqueos rotundos (borrar una DB, leer secretos, romper producción) que corren *antes* de cualquier IA; nada los convence.
3. **Tus límites y tu lista** — topes por pago y por mes, lista de a quién se puede pagar, "cuenta nueva → pregunta a una persona", y coherencia (¿el destinatario coincide con la tienda/factura?).
4. **Una IA, como una señal más** — un modelo rápido (Claude Haiku) detecta trucos nuevos y suma una señal, pero **nunca es lo único** entre un pago y un atacante (también puede ser engañada).

El resultado: **permitir**, **frenar** o **pedir aprobación humana**. Y cada decisión queda encadenada en un **registro inalterable** (`hash_n = sha256(prev_hash + canonicalJSON(record))`): si alguien edita una entrada pasada, la verificación se pone roja en esa fila exacta. No le creas al agente — verifica el registro.

## Qué es real y está en vivo

- **API de decisión** corriendo 24/7 en **Fly.io** (caliente, < 500 ms p99).
- **Ledger a prueba de alteraciones** en **Supabase** (Postgres + RLS + Realtime), con endpoint de verificación.
- **Demo de dos agentes** (protegido vs. sin protección) que **scrapea páginas reales con Firecrawl**, extrae el destinatario y deja que el API real decida.
- **Fintual**: usa el **NAV real** (API pública) de un fondo como caso de inversión.
- **Alertas por WhatsApp** vía **Kapso** y **alertas habladas** vía **ElevenLabs** (voz por idioma).
- **SDK publicado en npm** (`specter-sdk`).
- **Agentes corriendo 24/7**: rondas reales atacante-vs-protector que van llenando la cadena, visibles en el home y en el panel.

## Stack

TypeScript · monorepo pnpm · Hono (API en Fly) · Next.js 16 / React 19 / Tailwind (web en Vercel) · Supabase · Claude (Haiku) · Firecrawl · ElevenLabs · Kapso · Fintual · Stripe.

## Casos de uso

Compras en línea, facturas de proveedor adulteradas, agentes programadores que ejecutan acciones destructivas, y abuso de reembolsos en agentes de soporte — en cualquier lugar donde un agente pueda gastar dinero o romper algo que no se puede deshacer.
