import pytest


@pytest.mark.behavior
def test_inactive_material_is_hidden_until_reactivated(client):
    create_response = client.post(
        "/v1/materials",
        json={
            "name": "Behavior Glass",
            "category": "glass",
            "points_per_kg": 80,
            "min_weight_grams": 50,
            "ai_class_name": "behavior_glass",
            "confidence_threshold": 0.8,
        },
    )
    assert create_response.status_code == 201
    material_id = create_response.json()["id"]

    delete_response = client.delete(f"/v1/materials/{material_id}")
    assert delete_response.status_code == 204

    active_catalog = client.get("/v1/materials")
    assert active_catalog.status_code == 200
    assert active_catalog.json() == {"materials": [], "total": 0}

    reactivate_response = client.put(
        f"/v1/materials/{material_id}",
        json={"is_active": True},
    )
    assert reactivate_response.status_code == 200

    restored_catalog = client.get("/v1/materials")
    assert restored_catalog.status_code == 200
    assert restored_catalog.json()["total"] == 1
    assert restored_catalog.json()["materials"][0]["id"] == material_id


@pytest.mark.behavior
def test_catalog_is_sorted_by_material_name(client):
    for index, name in enumerate(("Steel", "Aluminum", "Cardboard"), start=1):
        response = client.post(
            "/v1/materials",
            json={
                "name": name,
                "category": "metal" if name != "Cardboard" else "paper",
                "points_per_kg": 100 + index,
                "min_weight_grams": 10,
                "ai_class_name": f"behavior_{name.lower()}",
                "confidence_threshold": 0.75,
            },
        )
        assert response.status_code == 201

    response = client.get("/v1/materials")

    assert response.status_code == 200
    names = [material["name"] for material in response.json()["materials"]]
    assert names == ["Aluminum", "Cardboard", "Steel"]

