from fastapi import APIRouter, HTTPException

from schemas.search import SearchRequest, SearchResponse
from services.search.search_service import SearchService

router = APIRouter()

search_service = SearchService()


@router.post("/search", response_model=SearchResponse)
async def semantic_search(request: SearchRequest):
    try:
        response = await search_service.search(request)
        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))