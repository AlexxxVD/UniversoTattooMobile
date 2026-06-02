# Universo Tattoo Mobile 

¡Bienvenido a **Universo Tattoo Mobile**! Una solución mobile integral desarrollada como proyecto de tesis final. La aplicación está diseñada para conectar de forma eficiente a entusiastas del tatuaje con artistas y estudios, ofreciendo además una tienda de productos e insumos relacionados, gestión de turnos, pasarela de pagos y un módulo de administración completo.

---

##  Características Principales

###  Módulo de Usuarios y Autenticación
*   **Flujo de Registro y Verificación:** Sistema seguro con confirmación de cuenta y verificación pendiente.
*   **Recuperación de Contraseña:** Flujo completo para restablecer credenciales de forma segura.

###  Tienda y Carrito (Módulo Cliente)
*   **Catálogo de Productos:** Exploración de insumos, indumentaria o accesorios con vista de detalle dinámica basada en ID.
*   **Gestión de Carrito:** Adición, modificación y eliminación de productos en tiempo real antes del checkout.
*   **Flujo de Pagos Integrado:** Pantallas dedicadas para el seguimiento del estado del pago (Pendiente, Confirmado y Fallido).

###  Información y Soporte
*   Módulos informativos de envíos, políticas de devoluciones, términos y condiciones, y sección de Preguntas Frecuentes (FAQ)[cite: 1].

###  Panel de Administración (`(admin)`)
*   **Dashboard de Control:** Gestión centralizada de pedidos, órdenes de compra, categorías y clientes para los administradores del estudio[cite: 1].

---

## Stack Tecnológico

El proyecto está construido sobre una arquitectura robusta y escalable[cite: 1]:

*   **Framework:** React Native con **Expo Router** (Estructura basada en archivos dentro de la carpeta `app/`)[cite: 1].
*   **Lenguaje:** TypeScript para un tipado estático, garantizando un código mantenible y robusto[cite: 1].
*   **Backend-as-a-Service:** Supabase (Autenticación, PostgreSQL en tiempo real y Storage para imágenes de portfolios y productos)[cite: 1].
*   **Servicios de Email:** Sistema avanzado de notificaciones por correo electrónico integrado para alertas del sistema y confirmaciones[cite: 1].

---

##  Estructura del Proyecto

El enrutamiento de la aplicación utiliza la estructura nativa de **Expo Router**, dividida estratégicamente por roles y flujos de usuario[cite: 1]:

```text
UniversoTattooMobile/
├── app/
│   ├── (admin)/            # Panel de control de administración
│   │   ├── categories.tsx  # Gestión de categorías de productos
│   │   ├── customers.tsx   # Control de clientes
│   │   ├── orders.tsx      # Gestión de órdenes y pedidos
│   │   ├── products.tsx    # ABM de productos/insumos
│   │   └── settings.tsx    # Configuración del panel administrador
│   ├── (auth)/             # Flujo de autenticación de usuarios
│   │   ├── confirm.tsx
│   │   ├── forgot-password.tsx
│   │   ├── register.tsx
│   │   ├── reset-password.tsx
│   │   └── verify-pending.tsx
│   ├── (client)/           # Interfaz principal del cliente
│   │   ├── pago/           # Flujo de pasarela de pagos
│   │   │   ├── confirmado.tsx
│   │   │   ├── fallido.tsx
│   │   │   └── pendiente.tsx
│   │   ├── product/
│   │   │   └── [id].tsx    # Detalle dinámico del producto
│   │   ├── cart.tsx        # Carrito de compras
│   │   ├── checkout.tsx    # Proceso de finalización de compra
│   │   ├── store.tsx       # Tienda principal
│   │   └── ...             # FAQ, Envíos, Devoluciones, Perfil
│   ├── _layout.tsx         # Layout raíz y proveedores globales
│   └── index.tsx           # Punto de entrada de la aplicación
├── assets/                 # Recursos estáticos (Imágenes WebP optimizadas)
├── .env                    # Variables de entorno (Supabase Keys, etc.)
├── app.json                # Configuración global de Expo
├── DEPLOY_WEB.md           # Documentación para el despliegue web
├── EMAIL_SYSTEM_README.md  # Documentación del sistema de emails integrado
└── REVISION_SISTEMA_TESIS.md # Registro y control de revisión de tesis

Configuración e Instalación
Prerrequisitos
Node.js (v18 o superior)[cite: 1]

Expo Go instalado en tu dispositivo móvil o un emulador configurado (Android Studio / Xcode)[cite: 1].

Pasos
Clonar el repositorio:

Bash
   git clone [https://github.com/alexxxvd/universotattoomobile.git](https://github.com/alexxxvd/universotattoomobile.git)
   cd universo-tattoo-mobile
Instalar dependencias:

Bash
   npm install
Configurar Variables de Entorno:
Edita el archivo .env en la raíz del proyecto agregando tus credenciales de Supabase[cite: 1]:

Fragmento de código
   SUPABASE_URL=tu_url_de_supabase
   SUPABASE_ANON_KEY=tu_anon_key_de_supabase
Iniciar el servidor de desarrollo de Expo:

Bash
   npx expo start
Presioná a para emulador de Android, i para emulador de iOS, o escaneá el código QR con la app Expo Go en tu celular.

Documentación Adicional del Proyecto
Para profundizar en aspectos específicos del desarrollo, revisá los siguientes archivos incluidos en la raíz[cite: 1]:

REVISION_SISTEMA_TESIS.md: Notas, correcciones y estado actual del sistema de cara a la entrega de la carrera[cite: 1].

EMAIL_SYSTEM_README.md: Detalle técnico del funcionamiento del backend de mensajería y plantillas de correo[cite: 1].

DEPLOY_WEB.md: Instrucciones específicas por si se requiere compilar o visualizar módulos de la plataforma en entorno web[cite: 1].

 Autor
Alexander Varela - Analista de Sistemas & Full Stack Developer