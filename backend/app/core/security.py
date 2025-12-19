from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

#Hash contraseña texto plano
def hash_contrasena(contrasena: str) -> str:
    return pwd_context.hash(contrasena)

#Verificar contraseña texto plano contra hash
def verificar_contrasena(contrasena: str, contrasena_hashed: str) -> bool:
    return pwd_context.verify(contrasena, contrasena_hashed)