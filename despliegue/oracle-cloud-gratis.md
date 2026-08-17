# Desplegar gratis en Oracle Cloud (Always Free)

Esta guia complementa la seccion ["Despliegue en produccion con
HTTPS"](../README.md#despliegue-en-produccion-con-https) del README
principal: los pasos de Nginx/Certbot/PM2 son los mismos, lo unico que
cambia es de donde sale el servidor. Aca el servidor sale **gratis, para
siempre**, en vez de un VPS pago.

## Que es el nivel "Always Free"

No es una prueba gratuita: mientras te mantengas dentro de estos limites,
Oracle no te cobra nada, ningun mes, tengas o no eventos:

- Una VM `VM.Standard.A1.Flex` (procesador Ampere/ARM) con **2 OCPU y 12
  GB de RAM** — muchisimo mas de lo que este sistema necesita.
- 200 GB de almacenamiento (boot volume + block volume combinados).
- 10 TB de transferencia de salida por mes.

> Oracle viene reduciendo esta oferta con el tiempo sin avisar mucho (en
> 2026 bajaron la asignacion de Ampere de 4 OCPU/24 GB a 2 OCPU/12 GB), y
> en algunas regiones/horarios la capacidad gratuita esta agotada
> temporalmente (el famoso error **"Out of host capacity"**). Si te pasa,
> no es que te esten cobrando ni que hiciste algo mal: reintenta mas
> tarde, en otro horario, o proba otro "Availability Domain" dentro de tu
> misma region — suele liberarse capacidad en algun momento.

## 1. Crear la cuenta

1. Entra a [oracle.com/cloud/free](https://www.oracle.com/cloud/free/) y
   registrate. Te van a pedir una tarjeta para verificar identidad — el
   nivel Always Free no la cobra, pero da de baja la cuenta si detectan
   fraude en la verificacion, asi que usa una tarjeta real tuya.
2. Elegi con cuidado la **Home Region** (la region principal de tu
   cuenta): despues no se puede cambiar facilmente. Cualquier region
   cercana a Argentina (por ejemplo, alguna de Brasil) va a dar mejor
   latencia para tus invitados.

## 2. Crear la maquina virtual

1. En el menu, ir a **Compute → Instances → Create Instance**.
2. En "Image and shape", elegir:
   - **Imagen**: Ubuntu (la version LTS mas reciente disponible, ej.
     24.04), variante **aarch64/ARM** (porque el Ampere A1 es ARM, no
     Intel/AMD).
   - **Shape**: `VM.Standard.A1.Flex`, y ajustar manualmente a **2 OCPU /
     12 GB de memoria** (son los maximos "Always Free").
3. En "Add SSH keys", dejar que Oracle genere un par de claves y
   **descargar la clave privada** (la vas a necesitar para conectarte).
   En Windows, se usa con PuTTY o directamente con `ssh -i clave.key
   ubuntu@<ip>` desde PowerShell.
4. Boot volume: dejar el valor por defecto (50 GB) o subirlo hasta 200 GB
   sin costo extra si queres margen.
5. Crear la instancia y anotar la **IP publica** que le asigna.

## 3. Abrir los puertos 80 y 443 (paso que mucha gente se salta)

Por defecto, Oracle solo deja pasar trafico SSH (puerto 22). Hay que
abrir HTTP/HTTPS en **dos lugares distintos**:

**a) La regla de red de Oracle (Security List o Network Security
Group):**
En el menu de la instancia → "Subnet" → "Security Lists" (o "Network
Security Groups" si la creaste con uno) → "Add Ingress Rules":
- Origen `0.0.0.0/0`, protocolo TCP, puerto destino `80`
- Origen `0.0.0.0/0`, protocolo TCP, puerto destino `443`

**b) El firewall interno de Ubuntu** (las imagenes de Oracle traen
`iptables` bloqueando todo salvo SSH por defecto):
```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save   # si no existe el comando: sudo apt install -y iptables-persistent
```

Si te olvidas de este paso, Certbot va a fallar al validar el dominio y
la pagina no va a cargar aunque Nginx este corriendo bien.

## 4. Conseguir un nombre de dominio (tambien puede ser gratis)

Let's Encrypt (el certificado HTTPS gratuito que usa este proyecto)
necesita un **nombre de dominio real** apuntando a tu servidor — no
funciona directo sobre una IP. Dos caminos:

- **Pagar un dominio propio** (~USD 10-15/ano, como se explica en el
  README principal) — lo mas prolijo si esto va a ser un negocio serio.
- **Usar un subdominio gratis** de un servicio de DNS dinamico, por
  ejemplo [DuckDNS](https://www.duckdns.org) (gratis, sin tarjeta):
  te da algo como `tu-sistema.duckdns.org` apuntando a la IP de tu VM.
  Sirve perfecto con Certbot y no tiene costo. Es la opcion que mas
  sentido tiene si el objetivo es $0/mes en todo el stack.

## 5. Instalar el sistema

Desde aca, seguir exactamente los pasos 2 a 8 de la seccion
["Pasos para desplegar"](../README.md#pasos-para-desplegar) del README
principal (instalar Node/Nginx/PM2, subir el proyecto, compilar el
frontend, configurar Nginx con `despliegue/nginx.conf.ejemplo`, activar
HTTPS con `certbot --nginx -d tu-sistema.duckdns.org`, y dejar el backend
corriendo con `despliegue/ecosystem.config.cjs`). Todo es identico a un
VPS pago: la unica diferencia es que este servidor no te genera factura
al final del mes.

## Resumen de costo mensual con esta opcion

| Item | Costo |
|---|---|
| Servidor (Oracle Always Free) | $0 |
| Certificado HTTPS (Let's Encrypt, se renueva solo) | $0 |
| Dominio (con DuckDNS) | $0 |
| Dominio propio (opcional, mas prolijo) | ~USD 1/mes prorrateado |

Con DuckDNS, el sistema completo — tengas 0 o 10 eventos ese mes — te
sale **$0**.
