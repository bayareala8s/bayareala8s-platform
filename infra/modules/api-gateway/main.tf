############################################
# BayServe v2 API Gateway Module
############################################

############################################
# HTTP API + CORS
############################################
resource "aws_apigatewayv2_api" "http" {
  name          = "${var.product_name}-${var.env}-http"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["https://selfserve.bayareala8s.com"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Authorization", "Content-Type"]
  }
}

############################################
# LAMBDA INTEGRATION
############################################
resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.lambda_arn
  payload_format_version = "2.0"
}

############################################
# COGNITO JWT AUTHORIZER
############################################
resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id          = aws_apigatewayv2_api.http.id
  name            = "${var.product_name}-${var.env}-jwt"
  authorizer_type = "JWT"

  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    issuer   = var.authorizer_issuer
    audience = [var.authorizer_audience]
  }
}

############################################
# PROTECTED ROUTES
############################################

# GET /flows
resource "aws_apigatewayv2_route" "flows_get" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "GET /flows"
  target             = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

# POST /ai/explain
resource "aws_apigatewayv2_route" "ai_explain_post" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "POST /ai/explain"
  target             = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

############################################
# PUBLIC ROUTE: $default
# Must be UNPROTECTED — lets CORS preflight succeed
############################################
resource "aws_apigatewayv2_route" "default_public" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "$default"
  target             = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
  authorization_type = "NONE"
}

############################################
# DEFAULT STAGE
############################################
resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}

############################################
# PERMISSIONS: Allow API to invoke Lambda
############################################
resource "aws_lambda_permission" "apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}
