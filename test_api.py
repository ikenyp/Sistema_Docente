#!/usr/bin/env python3
"""
Script para diagnosticar errores de API
Uso: python test_api.py
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"
API_URL = "http://localhost:8000/api"

def test_connection():
    """Prueba si el servidor está activo"""
    try:
        response = requests.get(f"{BASE_URL}/")
        print("✓ Servidor activo:", response.status_code)
        print("  Respuesta:", response.json())
        return True
    except Exception as e:
        print("✗ Error conectando al servidor:", e)
        return False

def test_login(email="test@example.com", password="password123"):
    """Prueba el login"""
    try:
        data = {
            "username": email,
            "password": password
        }
        response = requests.post(f"{BASE_URL}/auth/login", data=data)
        print(f"\n✓ Login - Status {response.status_code}")
        
        if response.ok:
            token_data = response.json()
            print("  Token:", token_data.get("access_token", "")[:20] + "...")
            print("  Role:", token_data.get("role", "N/A"))
            return token_data.get("access_token")
        else:
            print("  Error:", response.text)
            return None
    except Exception as e:
        print(f"✗ Error en login:", e)
        return None

def test_cursos(token, id_tutor=1):
    """Prueba el endpoint de cursos"""
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Probar sin filtro
        print(f"\n✓ GET /api/cursos")
        response = requests.get(f"{API_URL}/cursos", headers=headers)
        print(f"  Status: {response.status_code}")
        print(f"  Respuesta: {response.text[:200]}...")
        
        # Probar con filtro de tutor
        print(f"\n✓ GET /api/cursos?id_tutor={id_tutor}")
        response = requests.get(f"{API_URL}/cursos?id_tutor={id_tutor}", headers=headers)
        print(f"  Status: {response.status_code}")
        print(f"  Respuesta: {response.text[:200]}...")
        
        if response.ok:
            return response.json()
        else:
            print(f"  Error completo: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error obteniendo cursos:", e)
        return None

def main():
    print("=" * 60)
    print("DIAGNÓSTICO DE API")
    print("=" * 60)
    
    # Probar conexión
    if not test_connection():
        print("\n❌ No se puede conectar al servidor backend")
        print("   Asegúrate de que está corriendo en http://localhost:8000")
        return
    
    # Probar login
    token = test_login()
    if not token:
        print("\n❌ Error en login. Verifica credenciales")
        return
    
    # Probar cursos
    cursos = test_cursos(token)
    
    print("\n" + "=" * 60)
    if cursos is not None:
        if isinstance(cursos, list):
            print(f"✅ SE ENCONTRARON {len(cursos)} CURSOS")
            if len(cursos) > 0:
                print("\nCursos:")
                for curso in cursos:
                    print(f"  - {curso.get('nombre')} (ID: {curso.get('id_curso')})")
            else:
                print("\n⚠️  No hay cursos asignados a este docente")
        else:
            print(f"Respuesta: {cursos}")
    else:
        print("❌ Error obteniendo cursos - revisa los logs arriba")

if __name__ == "__main__":
    main()
