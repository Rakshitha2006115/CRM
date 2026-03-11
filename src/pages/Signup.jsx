import { useState } from "react"
import { supabase } from "../services/supabase"
import { useNavigate } from "react-router-dom"

export default function Signup(){

  const navigate = useNavigate()

  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const [isLoading,setIsLoading] = useState(false)

  const handleSignup = async (e)=>{
    e.preventDefault()
    setIsLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password
    })

    if(error){
      alert(error.message)
      setIsLoading(false)
      return
    }

    await supabase.from("users").insert({
      email: email,
      role: "client"
    })

    alert("Client account created")

    navigate("/login")
  }

  return(
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">

      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Create Client Account
          </h1>
          <p className="text-gray-600">
            Sign up to access the client portal
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="client@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          <p className="text-sm text-gray-600">
            Role: <span className="font-medium">Client</span>
          </p>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            {isLoading ? "Creating Account..." : "Sign Up"}
          </button>

        </form>

      </div>

    </div>
  )
}