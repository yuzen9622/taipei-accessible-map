import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://data.taipei/api/v1/dataset/61792c82-6609-41b2-9775-3a346934826d?scope=resourceAquire&limit=200"
    );
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(error, { status: 500 });
  }
}
