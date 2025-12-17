from app.core.security import hash_contrasena, verificar_contrasena

hash1 = hash_contrasena("123456")
print(hash1)

print(verificar_contrasena("123456", hash1))  # True
print(verificar_contrasena("000000", hash1))  # False
