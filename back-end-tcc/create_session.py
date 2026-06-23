from database import SessionLocal
from models import ActiveSession, SessionStatus, User, SmartBin
from datetime import datetime, timedelta, timezone

def main():
    db = SessionLocal()
    
    user = db.query(User).first()
    smart_bin = db.query(SmartBin).filter(SmartBin.bin_code == "BIN_TEST_001").first()
    
    if not user or not smart_bin:
        print("❌ Erro: Usuário ou Lixeira não encontrados no banco de dados.")
        return

    now_utc = datetime.now(timezone.utc)
    
    session = db.query(ActiveSession).filter(ActiveSession.session_token == "SESSAO_REAL_1000").first()

    if session:
        print("🔄 Sessão existente encontrada. Atualizando a validade para +24h...")
        session.expires_at = now_utc + timedelta(hours=24)
        session.status = SessionStatus.ACTIVE
        session.bin_id = smart_bin.id
    else:
        session = ActiveSession(
            session_token="SESSAO_REAL_1000",
            user_id=user.id,
            bin_id=smart_bin.id,
            started_at=now_utc,
            expires_at=now_utc + timedelta(hours=24),
            status=SessionStatus.ACTIVE,
            qr_code_scanned=True
        )
        db.add(session)
        
    db.commit()
    print(f"✅ Sessão pronta! Token: {session.session_token}")
    print(f"   Vinculada ao User ID: {user.id} e Bin ID: {smart_bin.id}")

if __name__ == "__main__":
    main()
