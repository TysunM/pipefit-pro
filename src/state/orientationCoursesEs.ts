// The built-in modules, as courses, in Spanish
// --------------------------------------------
// The same nine courses as orientationCourses.ts, written in the Spanish a
// crew speaks on a job site in the United States: plain, direct, with the
// terms the trade uses in English kept where the crew uses them that way
// (PPE, SDS, lockout, fire watch). Shipped in the app, so the orientation
// works in Spanish on day one with no signal and no server key. Each course
// says what its English course says, point for point and question for
// question; the right answers sit at the same index.

import type { Course } from './orientation';

const q = (qq: string, choices: string[], answer: number, why: string) => ({ q: qq, choices, answer, why });
const s = (heading: string, ...points: string[]) => ({ heading, points });

export const BUILTIN_COURSES_ES: Readonly<Record<string, Course>> = {
  'b:welcome': {
    title: 'Su primer día en la obra',
    sections: [
      s('La obra manda', 'Cada obra tiene sus propias reglas, y esas van primero.', 'Lo que se enseña aquí es la práctica general del oficio.', 'Donde su obra diga otra cosa, la obra tiene la razón.'),
      s('Usted puede parar el trabajo', 'Si ve algo inseguro, pare el trabajo. Nadie se lo puede reprochar.', 'No necesita estar seguro.', 'Un casi accidente se reporta el mismo día, igual que una lesión, porque el próximo le toca a alguien.'),
      s('Al pasar la puerta', 'Fírmese o pase su gafete cada vez que entre, para que la obra sepa quién está adentro en una emergencia.', 'Sepa dónde está el punto de reunión y hacia dónde sopla el viento: con una fuga de gas se camina contra el viento hasta el punto de reunión.', 'Conozca los tonos de alarma de la obra. La orientación le dice cuál significa qué.'),
      s('Pregunte', 'Un oficial prefiere contestar una pregunta que llenar un reporte de incidente.', 'Su capataz es la primera persona a quien pregunta; el oficial de seguridad es la segunda.', 'En una buena obra nadie piensa menos de un hombre que pregunta.'),
      s('Apto para trabajar', 'Los teléfonos se quedan fuera del área de trabajo, salvo que la obra los permita para trabajar.', 'Nada de alcohol ni drogas; algunas medicinas recetadas hay que avisarlas al capataz.', 'Apto para trabajar quiere decir descansado, sobrio y capaz de hacer la tarea.'),
    ],
    questions: [
      q('La regla de su obra y este curso no coinciden. ¿Cuál manda?', ['Este curso', 'La regla de su obra', 'La más estricta, según usted', 'Que un oficial decida'], 1, 'Cada obra tiene sus propias reglas, y esas van primero.'),
      q('Ve algo que parece inseguro, pero no está seguro. ¿Qué hace?', ['Sigue trabajando y lo vigila', 'Para el trabajo', 'Espera a que pase el capataz', 'Termina su tarea y luego lo reporta'], 1, 'Usted tiene autoridad para parar el trabajo, y no necesita estar seguro.'),
      q('Hubo un casi accidente y nadie salió lastimado. ¿Cuándo se reporta?', ['Nunca, nadie salió lastimado', 'Al final de la semana', 'El mismo día, como una lesión', 'Solo si vuelve a pasar'], 2, 'Un casi accidente se reporta el mismo día, porque el próximo le toca a alguien.'),
      q('Suena la alarma de fuga de gas. ¿Hacia dónde camina?', ['A favor del viento, lejos de la unidad', 'Contra el viento, al punto de reunión', 'A la puerta', 'A su camioneta'], 1, 'Con una fuga de gas se camina contra el viento hasta el punto de reunión y se cuentan cabezas.'),
      q('¿A quién le pregunta primero cuando no sabe?', ['Al oficial de seguridad', 'A su capataz', 'A otro recién contratado', 'A nadie; lo resuelve solo'], 1, 'Su capataz es la primera persona a quien pregunta; el oficial de seguridad es la segunda.'),
    ],
  },
  'b:ppe': {
    title: 'Equipo de protección personal (PPE)',
    sections: [
      s('Lo básico, en todas partes', 'Casco, lentes de seguridad con protección lateral, botas con puntera de seguridad y tacón, chaleco o camisa de alta visibilidad, pantalón largo.', 'Shorts, tenis y camisas sin mangas no entran a la obra.'),
      s('Guantes según la tarea', 'Anticorte para acero y lámina, de cuero para rigging, guantes químicos cuando lo diga la SDS.', 'Quítese los guantes cerca de equipo que gira: un taladro o una roscadora puede enrollar el guante, y la mano con él.'),
      s('Cara y oídos', 'La careta va sobre los lentes para esmerilar, cincelar, cortar con disco y vaciar químicos.', 'La protección auditiva se usa donde está señalada, y donde tenga que alzar la voz para que lo oigan a un brazo de distancia.', 'Ocho horas a 85 decibeles es el nivel en que actúa la ley; un esmeril suena más fuerte.'),
      s('Ropa resistente al fuego', 'Se usa donde la obra lo exige: trabajo eléctrico con corriente, unidades de proceso con producto inflamable, trabajo en caliente.', 'La ropa sintética se derrite en la piel en un flamazo; la ropa FR no.'),
      s('Revise antes de usar', 'Un casco rajado, lentes rayados, una correa de arnés deshilachada o un guante cortado se reemplaza, no se usa.', 'Un casco que recibió un golpe se reemplaza aunque se vea bien.'),
    ],
    questions: [
      q('Va a usar una roscadora de tubo. ¿Y sus guantes?', ['Guantes de cuero puestos', 'Guantes anticorte puestos', 'Sin guantes', 'Los que traiga puestos'], 2, 'El equipo que gira puede enrollar el guante y la mano con él; los guantes se quitan.'),
      q('Está esmerilando una soldadura. ¿Qué lleva en la cara?', ['Solo lentes de seguridad', 'Careta sobre los lentes de seguridad', 'Careta en lugar de lentes', 'Un cubrebocas para polvo'], 1, 'La careta va sobre los lentes de seguridad para esmerilar; los lentes solos no bastan contra un disco que revienta.'),
      q('¿Cuándo se exige protección auditiva, además de donde está señalada?', ['Solo cerca de las grúas', 'Cuando tiene que alzar la voz para que lo oigan a un brazo de distancia', 'Nunca, salvo que esté señalada', 'Solo en el turno de noche'], 1, 'Donde tenga que alzar la voz para que lo oigan a un brazo de distancia.'),
      q('Su casco recibió un golpe de una conexión que cayó y se ve bien.', ['Siga usándolo', 'Reemplácelo', 'Úselo hasta terminar el trabajo', 'Gírelo'], 1, 'Un casco que recibió un golpe se reemplaza aunque se vea bien.'),
      q('¿Por qué ropa FR cerca de producto inflamable?', ['Abriga más', 'Se ve profesional', 'La ropa sintética se derrite en la piel en un flamazo', 'Es más barata'], 2, 'La ropa sintética se derrite en la piel en un flamazo; la ropa FR no.'),
    ],
  },
  'b:fall': {
    title: 'Trabajo en alturas',
    sections: [
      s('Seis pies', 'En una obra de construcción, la protección contra caídas se exige a seis pies o más sobre un nivel inferior.', 'Eso quiere decir barandales, una red, o un arnés con línea de vida y un anclaje.', 'Algunas obras la exigen más abajo; las reglas de la obra lo dicen.'),
      s('Amarrado todo el tiempo', 'Cien por ciento amarrado: conectado todo el tiempo que esté en altura, incluso mientras se mueve.', 'Una línea de vida doble le deja conectar el segundo gancho antes de soltar el primero.', 'Un anclaje aguanta 5,000 libras por persona, o está diseñado y marcado por una persona competente. Un barandal o un tubo chico no es un anclaje.'),
      s('Su arnés', 'Revise las correas, las costuras, la argolla D, las hebillas y los ganchos antes de cada uso.', 'Un arnés que detuvo una caída se saca de servicio.'),
      s('Escaleras', 'Tres puntos de apoyo, de frente a la escalera, nunca en los dos peldaños de arriba.', 'Un pie de separación por cada cuatro pies de altura, la parte de arriba asegurada y tres pies por encima del descanso.', 'Las herramientas van en el cinturón o se suben con cuerda, no en la mano.'),
      s('Andamios y huecos', 'Tarjeta verde: completo e inspeccionado. Amarilla: hay un peligro, arnés obligatorio. Roja: no se usa.', 'Nunca modifique un andamio usted mismo.', 'Los huecos se tapan, se aseguran y se marcan HOLE; nada se tira desde la altura.'),
    ],
    questions: [
      q('En una obra de construcción, ¿desde qué altura se exige protección contra caídas?', ['Cuatro pies', 'Seis pies', 'Diez pies', 'Doce pies'], 1, 'La protección contra caídas se exige a seis pies o más sobre un nivel inferior.'),
      q('¿Cuál de estos es un punto de anclaje?', ['Un barandal', 'Una charola de cables', 'Un punto marcado por una persona competente', 'Un conduit de dos pulgadas'], 2, 'Un anclaje debe aguantar 5,000 libras por persona o estar diseñado y marcado por una persona competente.'),
      q('Un andamio tiene tarjeta amarilla.', ['No lo use', 'Úselo; está completo', 'Úselo con arnés; hay un peligro', 'Arregle el peligro usted primero'], 2, 'Amarilla quiere decir que hay un peligro y el arnés es obligatorio.'),
      q('¿Cómo se coloca una escalera de extensión?', ['Un pie de separación por cada dos de altura', 'Un pie de separación por cada cuatro de altura', 'Lo más parada posible', 'Pegada a la pared'], 1, 'Un pie de separación por cada cuatro pies de altura, la parte de arriba asegurada y tres pies por encima del descanso.'),
      q('Su arnés detuvo una caída ayer. ¿Y hoy?', ['Lo usa después de revisarlo', 'Lo saca de servicio', 'Lo usa solo para escaleras', 'Lo lava y lo usa'], 1, 'Un arnés que detuvo una caída se saca de servicio.'),
    ],
  },
  'b:loto': {
    title: 'Lockout, tagout y energía almacenada',
    sections: [
      s('Aislado y bloqueado', 'Antes de trabajar en cualquier cosa que pueda arrancar, moverse, energizarse, presurizarse o liberar, se aísla y se bloquea.', 'Interruptores abiertos y bloqueados; válvulas cerradas, bloqueadas y etiquetadas; líneas con ciegos donde la obra lo exige.'),
      s('Su candado, su llave', 'Usted pone su propio candado en cada punto de aislamiento de su trabajo, y solo usted lo quita.', 'Nunca quite el candado de otra persona. Un candado que se quedó pasa por el procedimiento de la obra con un supervisor, nunca por unas cizallas.'),
      s('Pruébelo antes de confiar', 'Con el candado puesto, compruebe que la energía ya no está: oprima el arranque, pruebe el voltaje, abra un venteo.', 'Un candado no prueba nada hasta que haya probado el arranque.'),
      s('Energía almacenada', 'Una línea bloqueada todavía puede tener presión, producto caliente o vacío.', 'Resortes, contrapesos, capacitores, una carga suspendida y un acumulador guardan energía con todo apagado.', 'Purgue, ventee, drene y bloquee antes de abrir una brida, y afloje primero los pernos del lado contrario para que abra lejos de usted.'),
      s('Etiquetas y volver a energizar', 'Una etiqueta sola no es un candado; se usa solo donde no cabe un candado, con protección adicional.', 'Los que pusieron los candados los quitan, y el área se revisa despejada antes de energizar de nuevo.'),
    ],
    questions: [
      q('Hay un candado puesto. ¿A quién le toca quitarlo?', ['Al capataz', 'A cualquiera que termine el trabajo', 'Solo a la persona que lo puso', 'Al electricista'], 2, 'Su propio candado, su propia llave: solo usted lo quita, y nadie quita el candado de otra persona.'),
      q('El candado está puesto. ¿Qué sigue, antes de trabajar?', ['Empezar a trabajar', 'Probar el arranque para comprobar que la energía ya no está', 'Firmar el permiso', 'Quitar la etiqueta'], 1, 'Un candado no prueba nada hasta que haya probado el arranque.'),
      q('Una línea está bloqueada y aislada. ¿Todavía puede lastimarlo?', ['No, está bloqueada', 'Sí: todavía puede tener presión, producto caliente o vacío', 'Solo si la corriente está conectada', 'Solo en líneas de vapor'], 1, 'Una línea bloqueada todavía puede tener presión, producto caliente o vacío: purgue, ventee, drene y bloquee primero.'),
      q('Va a abrir una brida en una línea que puede tener presión. ¿Qué pernos afloja primero?', ['Los más cercanos a usted', 'Los del lado contrario, para que abra lejos de usted', 'Todos a la vez', 'Los de arriba'], 1, 'Afloje primero los pernos del lado contrario para que la brida abra lejos de usted.'),
      q('¿Cuándo basta una etiqueta sola?', ['Siempre, si está firmada', 'Solo donde no cabe un candado, con protección adicional', 'En trabajos cortos', 'Nunca'], 1, 'Una etiqueta sola no es un candado; se usa solo donde no cabe un candado, y entonces con protección adicional.'),
    ],
  },
  'b:hotwork': {
    title: 'Trabajo en caliente y fuego',
    sections: [
      s('Qué es trabajo en caliente', 'Cualquier cosa que haga una flama, una chispa o calor suficiente para prender algo: soldar, cortar, esmerilar, usar soplete, estañar.', 'En casi todas las obras necesita un permiso para una hora y un lugar, con la atmósfera probada donde pueda haber vapores.'),
      s('Despeje el área', 'Lo combustible se retira por lo menos treinta y cinco pies o se tapa con mantas contra fuego.', 'Las aberturas del piso y los drenajes dentro de esa distancia se tapan. Las chispas llegan más lejos de lo que cree y ruedan cuesta abajo.'),
      s('Vigilante de fuego (fire watch)', 'Se queda durante el trabajo y por lo menos treinta minutos después de la última chispa, más si la obra lo exige.', 'Extintor en la mano, sin otra tarea. El fire watch no es el soldador.', 'Revise el extintor primero: el seguro puesto, el manómetro en verde, la clase correcta.'),
      s('Cilindros', 'Parados y encadenados, con tapa cuando no están conectados.', 'Oxígeno y gas combustible a veinte pies de distancia o detrás de una barrera contra fuego.', 'Mangueras, reguladores y arrestadores de flama revisados antes de encender; se enciende con chispero, nunca con encendedor.'),
      s('Los demás', 'Las mamparas de soldar protegen los ojos de los demás. Nunca mire un arco sin careta.', 'Nunca suelde cerca de un solvente, un desengrasante o un recipiente abierto con producto.'),
    ],
    questions: [
      q('¿A qué distancia se retira lo combustible del trabajo en caliente?', ['Diez pies', 'Veinte pies', 'Treinta y cinco pies, o se tapa con mantas contra fuego', 'Cincuenta pies'], 2, 'Lo combustible se retira por lo menos treinta y cinco pies o se tapa con mantas contra fuego.'),
      q('¿Cuánto tiempo se queda el fire watch después de la última chispa?', ['Hasta que el soldador recoja', 'Por lo menos treinta minutos, más si la obra lo exige', 'Cinco minutos', 'Hasta la hora de comer'], 1, 'El fire watch se queda durante el trabajo y por lo menos treinta minutos después de la última chispa.'),
      q('¿Puede el soldador ser el fire watch?', ['Sí, si tiene experiencia', 'No: el fire watch no tiene otra tarea', 'Sí, en trabajos chicos', 'Solo con permiso'], 1, 'El fire watch no tiene otra tarea, y el fire watch no es el soldador.'),
      q('¿Cómo se almacenan el oxígeno y el gas combustible?', ['Juntos, encadenados', 'A veinte pies de distancia o detrás de una barrera contra fuego', 'Acostados', 'En la camioneta'], 1, 'El oxígeno y el gas combustible se almacenan a veinte pies de distancia o detrás de una barrera contra fuego.'),
      q('¿Con qué se enciende el soplete?', ['Con un encendedor', 'Con un cerillo', 'Con un chispero', 'Con el arco'], 2, 'El soplete se enciende con chispero, nunca con encendedor.'),
    ],
  },
  'b:confined': {
    title: 'Espacios confinados y excavaciones',
    sections: [
      s('Qué es un espacio confinado', 'Lo bastante grande para entrar, no hecho para ocuparse, con entradas y salidas limitadas: un tanque, un recipiente, una fosa, un tubo grande, una bóveda, una zanja.', 'Un espacio que requiere permiso además tiene un peligro: una atmósfera peligrosa, riesgo de quedar sepultado, paredes inclinadas, o cualquier otra cosa que pueda lastimarlo adentro.'),
      s('Antes de que alguien entre', 'Un permiso, un vigía en la entrada, una atmósfera probada y una salida.', 'Oxígeno entre 19.5 y 23.5 por ciento, gas inflamable por debajo del diez por ciento de su límite inferior de explosividad, gases tóxicos por debajo de sus límites.', 'El nitrógeno no huele y mata en dos respiros. Un recipiente purgado es un recipiente que hay que probar.'),
      s('El vigía', 'Se queda afuera, lleva la cuenta, mantiene contacto y pide ayuda.', 'El vigía nunca entra. La mayoría de los muertos en espacios confinados entraron a rescatar al primero.', 'El rescate lo hace el equipo entrenado con el equipo, nombrado en el permiso antes de que alguien entre.'),
      s('Excavaciones', 'Cinco pies de profundidad o más necesita un sistema de protección: talud, bancos, apuntalamiento o caja de zanja, salvo en roca estable.', 'Cuatro pies o más necesita una escalera o rampa a menos de veinticinco pies de cada trabajador.', 'El material excavado y el equipo se quedan a dos pies del borde. Una persona competente inspecciona antes de cada turno y después de la lluvia.'),
      s('Nunca', 'Nunca trabaje debajo de una carga suspendida o de un cucharón.', 'Nunca entre a una zanja que no ha sido inspeccionada.'),
    ],
    questions: [
      q('La lectura de oxígeno en la entrada es 18 por ciento. ¿Entra?', ['Sí, está bastante cerca', 'No: el oxígeno debe estar entre 19.5 y 23.5 por ciento', 'Sí, con cubrebocas', 'Sí, para echar un vistazo'], 1, 'El oxígeno debe estar entre 19.5 y 23.5 por ciento antes de entrar.'),
      q('Su compañero se desploma dentro de un recipiente. ¿Qué hace?', ['Entra y lo saca', 'Se queda afuera, mantiene contacto y llama al equipo de rescate entrenado', 'Entra con una cuerda', 'Espera y observa'], 1, 'El vigía nunca entra; el rescate lo hace el equipo entrenado con el equipo.'),
      q('Una zanja tiene seis pies de profundidad en tierra común. ¿Qué necesita?', ['Nada especial', 'Un sistema de protección: talud, bancos, apuntalamiento o caja', 'Solo una escalera', 'Una cuerda'], 1, 'Una zanja de cinco pies o más necesita un sistema de protección salvo que esté en roca estable.'),
      q('¿A qué distancia del borde de la zanja se queda el material excavado?', ['Un pie', 'Dos pies', 'Seis pulgadas', 'Puede quedarse en el borde'], 1, 'El material excavado y el equipo se quedan a dos pies del borde.'),
      q('Un recipiente fue purgado con nitrógeno y se abrió hace una hora.', ['Es seguro; el nitrógeno no hace daño', 'Pruébelo antes de que alguien entre', 'Olfatee en la entrada', 'Entre con la escotilla abierta'], 1, 'El nitrógeno no huele y mata en dos respiros; un recipiente purgado es un recipiente que hay que probar.'),
    ],
  },
  'b:hazcom': {
    title: 'Químicos, polvo y la SDS',
    sections: [
      s('Etiquetas y la SDS', 'Cada químico tiene una etiqueta con pictogramas y una hoja de datos de seguridad (SDS) de dieciséis secciones.', 'En el campo, las secciones que importan son los peligros, el PPE, los primeros auxilios y qué hacer en un derrame.', 'Lea la SDS antes de usar algo por primera vez, y sepa dónde se guardan las hojas.'),
      s('Manejo', 'Nunca mezcle químicos, nunca ponga uno en un recipiente sin etiqueta, nunca use un recipiente de comida.', 'Mantenga la tapa puesta. Lávese antes de comer, beber o fumar.'),
      s('Lavaojos', 'Sepa dónde están el lavaojos y la regadera de seguridad más cercanos, y cómo llegar con los ojos cerrados.', 'Quince minutos de enjuague si le salpica en los ojos; otra persona pide ayuda mientras usted se enjuaga.'),
      s('Sílice y material viejo', 'Cortar, esmerilar o taladrar concreto, block, piedra y algunos refractarios hace un polvo que cicatriza los pulmones de por vida.', 'Métodos húmedos, una campana con aspiradora o un respirador con prueba de ajuste; un cubrebocas de papel no es un respirador.', 'El aislamiento viejo, los empaques, la loseta y la pintura pueden tener asbesto o plomo. ¿No está seguro? Pare y pregunte. No lo mueva.'),
      s('Gases', 'El ácido sulfhídrico, el monóxido de carbono, el cloro, el amoníaco y el nitrógeno son los gases que matan en las plantas de proceso.', 'Donde están presentes usted lleva un monitor personal, conoce los niveles de alarma, y camina contra el viento y cuesta arriba cuando suena.'),
    ],
    questions: [
      q('¿Cuánto tiempo se enjuaga una salpicadura de químico en los ojos?', ['Treinta segundos', 'Dos minutos', 'Quince minutos', 'Hasta que deje de arder'], 2, 'Quince minutos de enjuague es la regla para una salpicadura en los ojos.'),
      q('Tiene que esmerilar una base de concreto. ¿Qué protege sus pulmones?', ['Un cubrebocas de papel', 'Métodos húmedos, una campana con aspiradora o un respirador con prueba de ajuste', 'Aguantar la respiración', 'Trabajar rápido'], 1, 'Un cubrebocas de papel no es un respirador; se exigen métodos húmedos, una campana o un respirador con prueba de ajuste.'),
      q('Encuentra aislamiento viejo de tubería que no puede identificar.', ['Lo arranca y sigue', 'Para y pregunta; no lo mueve', 'Lo moja y lo quita', 'Lo embolsa usted mismo'], 1, 'Si encuentra material del que no está seguro, pare y pregunte. No lo mueva.'),
      q('Su monitor de gas suena. ¿Hacia dónde?', ['A favor del viento y cuesta abajo', 'Contra el viento y cuesta arriba', 'Hacia la unidad, a buscar la fuga', 'Se queda donde está'], 1, 'Camine contra el viento y cuesta arriba cuando suene el monitor.'),
      q('Un químico en una botella sin etiqueta.', ['Lo usa si sabe qué es', 'Nunca: nada va en un recipiente sin etiqueta', 'Lo huele para comprobar', 'Le pone etiqueta después'], 1, 'Nunca ponga un químico en un recipiente sin etiqueta, y nunca use uno.'),
    ],
  },
  'b:hands': {
    title: 'Manos, herramientas, levantar y rigging',
    sections: [
      s('Puntos de atrapamiento', 'Antes de mover algo, busque dónde podría machucar, aplastar o atrapar.', 'Los dedos no van en un barreno de perno; use un punzón para alinear una brida.'),
      s('La herramienta correcta, de la forma correcta', 'Una llave se jala, no se empuja, para que los nudillos no den contra el acero cuando resbale.', 'Un tubo de extensión en una llave es una llave rota esperando pasar.', 'Un desarmador no es un cincel; una llave no es un martillo.'),
      s('Revise las herramientas', 'Cinceles con cabeza de hongo, mangos rajados, cables deshilachados, guardas faltantes y clavijas de tierra rotas sacan la herramienta de servicio.', 'Las guardas del esmeril se quedan puestas; la velocidad nominal del disco es igual o mayor que la del esmeril.', 'La corriente pasa por un GFCI; un cable dañado se reemplaza, no se encinta.'),
      s('Levantar', 'Doble las rodillas, mantenga la carga cerca, no gire el cuerpo.', 'Pida ayuda o use una máquina para cualquier cosa pesada o incómoda. Cincuenta libras es un límite común para una persona; un tramo de tubo de seis pulgadas pesa más.'),
      s('Rigging', 'Solo los riggers entrenados hacen el rigging; solo el señalero designado le da señales a la grúa.', 'Nadie camina ni se para debajo de una carga suspendida, nunca. Las líneas guía controlan la carga; las manos no.', 'Revise las eslingas y los grilletes antes de cada izaje, y sepa el peso de la carga antes de que deje el piso.'),
    ],
    questions: [
      q('Está alineando los barrenos de una brida. ¿Qué va en el barreno?', ['Un dedo', 'Un punzón', 'Un perno, a tientas', 'Un desarmador'], 1, 'Los dedos no van en un barreno de perno; use un punzón para alinear una brida.'),
      q('Una llave se...', ['Empuja', 'Jala', 'Golpea con martillo', 'Usa con tubo de extensión'], 1, 'Una llave se jala, no se empuja, para que los nudillos no den contra el acero cuando resbale.'),
      q('Un cable de corriente tiene un corte en el forro.', ['Lo encinta', 'Lo reemplaza', 'Lo usa en seco', 'Lo usa si el GFCI se dispara'], 1, 'Un cable dañado no se encinta; se reemplaza.'),
      q('Hay una carga suspendida de la grúa. ¿Dónde se para?', ['Debajo, para guiarla', 'Nunca debajo', 'Debajo si es ligera', 'Encima'], 1, 'Nadie camina ni se para debajo de una carga suspendida, nunca.'),
      q('¿Quién le da señales a la grúa?', ['Cualquiera que vea un problema', 'El señalero designado', 'El rigger y el tubero juntos', 'El capataz por radio'], 1, 'Solo el señalero designado le da señales a la grúa.'),
    ],
  },
  'b:heat': {
    title: 'Calor, frío, clima y cansancio',
    sections: [
      s('Calor', 'Tome agua cada quince a veinte minutos, con sed o sin sed, un vaso a la vez. Descanse a la sombra en el horario que fija la obra.', 'Cuide a su compañero: confusión, dolor de cabeza, náusea, mareo, calambres o piel caliente y seca quieren decir sombra, enfriar y reportar ya.', 'La primera semana en el calor es la peligrosa: tramos más cortos y más descansos hasta que el cuerpo se acostumbre. Las bebidas energéticas no cuentan como agua.'),
      s('Frío', 'Capas, guantes secos, calcetines secos, un lugar caliente para descansar.', 'Temblar, torpeza y hablar arrastrado son las señales.', 'El acero congelado arranca la piel; use guantes para tocarlo.'),
      s('Rayos y viento', 'Cuando se oye un trueno, el trabajo en alturas y al aire libre se para y todos van al refugio.', 'Treinta minutos después del último trueno, el trabajo vuelve a empezar. Los andamios, las grúas y el acero no son refugio.', 'El viento fuerte para los izajes y el trabajo en alturas.'),
      s('Cansancio', 'Un hombre en su hora catorce comete los errores que un hombre descansado no comete.', 'Si está demasiado cansado para trabajar seguro, dígalo; es lo mismo que parar un trabajo inseguro.'),
    ],
    questions: [
      q('¿Cada cuánto toma agua en el calor?', ['Cuando tiene sed', 'Cada quince a veinte minutos', 'Solo en los descansos', 'Una vez por hora'], 1, 'Tome agua cada quince a veinte minutos, tenga sed o no.'),
      q('Su compañero está confundido y dejó de sudar.', ['Le dice que tome agua y siga', 'Sombra, enfriar y reportar ya', 'Lo manda a la camioneta', 'Espera a la hora de comer'], 1, 'La confusión y la piel caliente y seca son las señales; un hombre que las muestra se lleva a la sombra, se enfría y se reporta ya.'),
      q('¿Cuándo vuelve a empezar el trabajo después de un trueno?', ['Cuando para la lluvia', 'Treinta minutos después del último trueno', 'Diez minutos después', 'Cuando el capataz lo diga'], 1, 'Treinta minutos después del último trueno, el trabajo vuelve a empezar.'),
      q('¿Un andamio es refugio contra los rayos?', ['Sí, si está aterrizado', 'No', 'Sí, debajo de la plataforma', 'Solo los de acero'], 1, 'Los andamios, las grúas y el acero no son refugio.'),
      q('Está demasiado cansado para trabajar seguro.', ['Aguanta', 'Lo dice; es lo mismo que parar un trabajo inseguro', 'Se toma una bebida energética', 'Trabaja más despacio y no dice nada'], 1, 'Si está demasiado cansado para trabajar seguro, dígalo.'),
    ],
  },
};
